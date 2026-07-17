# Adopting `@microsoft/vscode-ext-webview` 0.10.0

This guide shows how to replace a copied webview API with the current
[`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview)
0.10.0 API. It describes only the target architecture used by this starter kit:
the package owns the transport, panel facade, middleware bodies, and React
hooks; the extension owns a thin integration layer.

> If an extension manages its own `vscode.WebviewPanel` and needs only the
> transport, use the package's
> [advanced integration guide](https://github.com/microsoft/vscode-documentdb/blob/HEAD/packages/vscode-ext-webview/ADVANCED.md)
> instead.

## 1. Install 0.10.0

```bash
npm install @microsoft/vscode-ext-webview@~0.10.0
```

`react`, `@trpc/client`, and `@trpc/server` are peer dependencies, so the
package uses the application's existing versions.

## 2. Use the side-aware entry points

| Import from                             | Runtime side                    | Primary API                                                                                                                        |
| --------------------------------------- | ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `@microsoft/vscode-ext-webview`         | shared                          | `initWebviewTrpc`, `mergeRouters`, `BaseRouterContext`, `AnyRouter`                                                                |
| `@microsoft/vscode-ext-webview/host`    | extension host                  | `openWebview`, `WebviewController`, `telemetryMiddlewareBody`, `TelemetryRunner<TEnrichment>`, `getInvocationSignal`               |
| `@microsoft/vscode-ext-webview/webview` | framework-independent webview   | `connectTrpc`, `vscodeLink`, `errorLink`                                                                                           |
| `@microsoft/vscode-ext-webview/react`   | React webview                   | `useTrpcClient`, `useConfiguration`, `useRpcEvents`, `WithWebviewContext`, `WebviewState`, `TrpcClient`, `AnyRouter`                |

The shared entry point imports neither `vscode` nor React. `/host` is the only
entry point that imports `vscode`; `/react` is the only one that imports React.
Import the root router type with `import type` in browser code.

## 3. Keep a consumer-owned integration layer

The starter kit keeps five small modules under `src/webviews/_integration/`:

- `trpc.ts` creates the tRPC instance and adapts telemetry.
- `appRouter.ts` combines common and per-view routers.
- `openAppWebview.ts` presets package-level panel options.
- `useTrpcClient.ts` pre-types the React hook with `AppRouter`.
- `WebviewRegistry.ts` maps view names to React components.

Delete the copied transport, controller, context provider, and client-hook
implementations after their consumers point to this layer.

### `trpc.ts`: create one tRPC instance

Version 0.10.0 telemetry middleware is a thin delegator. A generic
`TelemetryRunner<TEnrichment>` owns the telemetry scope, calls
`invoke(enrichment)` exactly once, classifies the returned result, and returns
it unchanged. The middleware merges the enrichment object into procedure
`ctx`.

The starter kit contributes a plain `telemetry` bag:

```ts
import { initWebviewTrpc, type BaseRouterContext } from '@microsoft/vscode-ext-webview';
import {
  getInvocationSignal,
  telemetryMiddlewareBody,
  type ProcedureTelemetry,
  type TelemetryRunner,
} from '@microsoft/vscode-ext-webview/host';

const trpc = initWebviewTrpc<BaseRouterContext>();
const { createCallerFactory, publicProcedure, router } = trpc;

type TelemetryEnrichment = { telemetry: ProcedureTelemetry };
export type WithTelemetry<T> = T & TelemetryEnrichment;

const runner: TelemetryRunner<TelemetryEnrichment> = {
  async run(eventId, invocation, invoke) {
    const telemetry: ProcedureTelemetry = { properties: {}, measurements: {} };
    const started = performance.now();
    const result = await invoke({ telemetry });
    telemetry.measurements.durationMs = performance.now() - started;

    if (getInvocationSignal(invocation.ctx)?.aborted) {
      telemetry.properties.result = 'Canceled';
    } else if (!result.ok && result.error) {
      telemetry.properties.result = 'Failed';
      telemetry.properties.error = result.error.name ?? '';
    }

    console.log(`[telemetry] ${eventId}`, telemetry);
    return result;
  },
};

export const publicProcedureWithTelemetry = publicProcedure.use(
  telemetryMiddlewareBody(runner, {
    buildEventId: ({ type, path }) => `myExtension.rpc.${type}.${path}`,
  }),
);

export { createCallerFactory, publicProcedure, router, trpc };
```

Keep the enrichment field off the base context when some procedures use plain
`publicProcedure`. Instrumented handlers narrow with the consumer-owned alias:

```ts
.query(({ ctx }) => {
  const trackedContext = ctx as WithTelemetry<RouterContext>;
  trackedContext.telemetry.properties.operation = 'list';
});
```

For Application Insights, enrich with an action context instead:

```ts
type WithTelemetry<T> = T & { actionContext: IActionContext };
```

The runner can then wrap `invoke({ actionContext })` in
`callWithTelemetryAndErrorHandling(eventId, ...)`. That backend already records
duration; the runner remains responsible for cancellation and failure
classification.

### `appRouter.ts`: combine application routers

Extend the package context with application fields and create the root router
from the same `router` exported by `trpc.ts`:

```ts
import { type BaseRouterContext as FrameworkBaseRouterContext } from '@microsoft/vscode-ext-webview';
import { publicProcedure, router } from './trpc';

export type BaseRouterContext = FrameworkBaseRouterContext & {
  webviewName: string;
};

const commonRouter = router({
  // shared procedures
});

export const appRouter = router({
  common: commonRouter,
  demo: {
    mainView: mainViewRouter,
  },
});

export type AppRouter = typeof appRouter;
```

When independent router objects need composition, use `mergeRouters` returned
by `initWebviewTrpc()` rather than importing it from `@trpc/server`.

Keep `trpc.ts` independent of `appRouter.ts` and all per-view routers. This
prevents a circular import while router declarations execute at module load.

### `useTrpcClient.ts`: pre-type the package hook

```ts
import { useTrpcClient as useFrameworkTrpcClient, type TrpcClient } from '@microsoft/vscode-ext-webview/react';
import { type AppRouter } from './appRouter';

export function useTrpcClient(): TrpcClient<AppRouter> {
  return useFrameworkTrpcClient<AppRouter>();
}
```

The hook returns the client directly. Components use
`const trpcClient = useTrpcClient()`.

### `openAppWebview.ts`: preset host wiring

Wrap `openWebview` once so every panel uses the same router, tRPC instance,
source layout, and bundle mode:

```ts
return openWebview<AppRouter, TConfiguration, BaseRouterContext>(ext.context, {
  title: options.title,
  viewType: options.webviewName,
  router: appRouter,
  trpc,
  context: options.context,
  config: options.config,
  sourceLayout: WEBVIEW_CONFIG.bundle,
  devServerHost: WEBVIEW_CONFIG.devServerHost,
  isBundled: !!ext.isBundle,
  icon: options.icon,
  viewColumn: options.viewColumn,
});
```

Pass the `trpc` instance rather than a separate caller factory, and always set
`isBundled` so the package can select the production or development layout.
Use a `WebviewController` subclass only when a panel needs stateful methods or
lifecycle behavior beyond the returned controller handle.

### `WebviewRegistry.ts`: register React views

```ts
export const WebviewRegistry = {
  mainView: MainView,
} as const;

export type WebviewName = keyof typeof WebviewRegistry;
```

Pass a registry key as the `webviewName` option to `openAppWebview`.

## 4. Point application code at the integration layer

Per-view routers import context types from `appRouter.ts` and procedure builders
from `trpc.ts`:

```ts
import { type BaseRouterContext } from '../../_integration/appRouter';
import { publicProcedureWithTelemetry, router, type WithTelemetry } from '../../_integration/trpc';
```

React components import the pre-typed hook:

```ts
import { useTrpcClient } from '../../_integration/useTrpcClient';

const trpcClient = useTrpcClient();
```

The webview entry point takes `WithWebviewContext` and `WebviewState` from the
package and the component registry from the integration layer:

```tsx
import { type WebviewState, WithWebviewContext } from '@microsoft/vscode-ext-webview/react';
import { type WebviewName, WebviewRegistry } from './_integration/WebviewRegistry';
```

Use `useConfiguration<T>()` for initial panel configuration and
`useRpcEvents()` for webview-wide query and mutation outcome observation.

## 5. Remove copied framework code

After all imports resolve through the package and integration layer, delete the
local transport link, panel controller, tRPC initialization, React context, and
client hooks. Keep consumer policy such as adaptive theming, context-menu
handling, routers, telemetry naming, and the registry in the application.

Transport tests belong to the package. Consumer tests should exercise the root
router through its caller:

```ts
const caller = createCallerFactory(appRouter)({});
const result = await caller.demo.mainView.hello();
```

## 6. Verify the result

Run the repository's localization, formatting, lint, test, and build commands,
then manually open each view and exercise representative queries, mutations,
subscriptions, cancellation, and error paths.
