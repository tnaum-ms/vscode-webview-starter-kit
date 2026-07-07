# Migrating from the local webview API to `@microsoft/vscode-ext-webview`

This guide is for **starter-kit users on the all-in path** (React + tRPC +
webview). If you cloned this repository before it adopted the published package,
your webview transport lived in a local `src/webviews/api/` folder that you
copied along with everything else. This document explains how to replace that
local copy with the published [`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview)
package and rewrite your code to consume it.

The starter kit itself has already made this move — every change described below
is visible in this repository's history. Use it as the reference implementation.

> **Who this is _not_ for.** If you brought your own `vscode.WebviewPanel` and
> only want the transport, see the `attachTrpc` section of the package's
> [ADVANCED.md](https://github.com/microsoft/vscode-documentdb/blob/HEAD/packages/vscode-ext-webview/ADVANCED.md).
> This guide assumes you use the framework's panel facade and React hooks.

---

## 1. What changed, in one paragraph

The local `api/` copy mixed everything into one folder: the tRPC init
(`extension-server/trpc.ts`), the panel controller
(`extension-server/WebviewController.ts`), the transport link and hooks
(`webview-client/`), the router (`configuration/appRouter.ts`), and the registry
(`configuration/WebviewRegistry.ts`). The package now owns the transport, the
panel facade, and the React glue, exposing them through **four side-aware entry
points**. Your repository keeps only the thin, consumer-owned glue — the router,
the telemetry adapter, the registry, and a panel preset — in a new
`src/webviews/_integration/` folder. The `api/` folder is deleted.

---

## 2. Install the package

```bash
npm install @microsoft/vscode-ext-webview
```

`react`, `@trpc/client`, and `@trpc/server` are **peer** dependencies — the
package uses whatever versions you already have and will not pull duplicates
into your webview bundle. `react-dom` is not a peer; it is a transitive concern
of your app shell.

## 3. The four entry points

| Import from                             | Side                           | Contents you will use                                                                                                                                                    |
| --------------------------------------- | ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `@microsoft/vscode-ext-webview`         | shared (no `vscode`, no React) | `initWebviewTrpc`, `BaseRouterContext`                                                                                                                                   |
| `@microsoft/vscode-ext-webview/host`    | extension host (Node)          | `openWebview`, `WebviewController`, `telemetryMiddlewareBody`, `TelemetryRunner`, `ProcedureTelemetry`, `WithTelemetry`, `getInvocationSignal`, `consoleProcedureLogger` |
| `@microsoft/vscode-ext-webview/webview` | webview (any framework)        | `connectTrpc`, `vscodeLink`, `errorLink`                                                                                                                                 |
| `@microsoft/vscode-ext-webview/react`   | webview (React)                | `useTrpcClient`, `useConfiguration`, `WithWebviewContext`, `WebviewState`, `type TrpcClient`                                                                             |

Import-side rules the split enforces: `.` pulls in neither `vscode` nor React;
`/webview` pulls in no React; `/react` is the only React entry; `/host` is the
only entry that pulls in `vscode`. Keeping host code out of the browser bundle
is why webview code imports the router **type-only**: `import type { AppRouter }`.

---

## 4. Create `src/webviews/_integration/`

This is the consumer-owned glue layer. The underscore prefix sorts it above
feature folders in the explorer — the conventional "infrastructure, not feature
code" signal. Create the following files (all are present in this repo under
[src/webviews/\_integration/](src/webviews/_integration/)).

### `configuration.ts` — one place for runtime knobs

Move the constants that used to be scattered across the controller (dev-server
host, bundle layout, telemetry namespace) into a single `WEBVIEW_CONFIG` object.

```ts
const TELEMETRY_NAMESPACE = 'webviewStarter';

export const WEBVIEW_CONFIG = {
  telemetry: {
    rpcEventPrefix: `${TELEMETRY_NAMESPACE}.rpc`,
    webviewEventPrefix: `${TELEMETRY_NAMESPACE}.webview.event`,
    webviewErrorPrefix: `${TELEMETRY_NAMESPACE}.webview.error`,
  },
  bundle: {
    bundled: { dir: '', file: 'views.js' },
    dev: { dir: 'out/src/webviews', file: 'index.js' },
  },
  devServerHost: 'http://localhost:18080',
} as const;
```

### `trpc.ts` — the tRPC leaf module

This replaces the old `api/extension-server/trpc.ts`. The key change is the
telemetry model: the old file defined its own middleware inline. The package now
ships only the middleware **body** (`telemetryMiddlewareBody`) plus a **runner**
contract (`TelemetryRunner`); you supply the adapter. This keeps event-name
semantics entirely in your hands.

```ts
import { initWebviewTrpc, type BaseRouterContext as FrameworkBaseRouterContext } from '@microsoft/vscode-ext-webview';
import {
  getInvocationSignal,
  telemetryMiddlewareBody,
  type ProcedureTelemetry,
  type TelemetryRunner,
  type WithTelemetry as FrameworkWithTelemetry,
} from '@microsoft/vscode-ext-webview/host';

const trpc = initWebviewTrpc<FrameworkBaseRouterContext>();
const { publicProcedure, router, createCallerFactory } = trpc;

export type WithTelemetry<T extends { telemetry?: unknown }> = FrameworkWithTelemetry<T, ProcedureTelemetry>;

const consoleTelemetryRunner: TelemetryRunner = {
  async run(invocation, execute) {
    const telemetry: ProcedureTelemetry = { properties: {}, measurements: {} };
    // The body records duration + the Canceled/Failed outcome into `telemetry`.
    const result = await execute(telemetry);
    if (getInvocationSignal(invocation.ctx)?.aborted) {
      telemetry.properties.aborted = 'true';
    }
    console.log(
      `[telemetry] ${invocation.type} ${invocation.path} (${telemetry.measurements.durationMs ?? 0}ms)`,
      telemetry.properties,
    );
    return result;
  },
};

export const publicProcedureWithTelemetry = publicProcedure.use((opts) =>
  telemetryMiddlewareBody(opts, consoleTelemetryRunner),
);

// Single import location for per-view routers and the panel preset. Passing the
// whole `trpc` instance means the caller factory can never be mismatched with
// the router.
export { createCallerFactory, publicProcedure, router, trpc };
```

To productionise, swap the body of `run` for a wrapper around your telemetry
library — for example `callWithTelemetryAndErrorHandling` from
`@microsoft/vscode-azext-utils`, aliasing `WithTelemetry<T>` to
`FrameworkWithTelemetry<T, ITelemetryContext>`.

### `appRouter.ts` — router + flavoured context

Mostly a move of `api/configuration/appRouter.ts`. The one structural change:
`BaseRouterContext` now **extends the framework's** `BaseRouterContext` (which
already declares `telemetry?` and `signal?`) instead of redeclaring them. Import
the tRPC primitives from `./trpc`, not from this file (see the circular-import
note below).

```ts
import { type BaseRouterContext as FrameworkBaseRouterContext } from '@microsoft/vscode-ext-webview';
import { publicProcedure, router } from './trpc';

export type BaseRouterContext = FrameworkBaseRouterContext & {
  webviewName: string;
};

// commonRouter + appRouter unchanged from your old copy…
export const appRouter = router({
  common: commonRouter,
  demo: {
    /* … */
  },
});
export type AppRouter = typeof appRouter;
```

> **Why `trpc.ts` is a separate leaf module.** `appRouter.ts` imports the
> per-view routers, and the per-view routers need `publicProcedureWithTelemetry`
> and `router`. If those lived in `appRouter.ts`, the per-view router would try
> to read them while `appRouter.ts` is still mid-evaluation — the classic
> `Cannot access 'publicProcedureWithTelemetry' before initialization` runtime
> error. Keeping the primitives in `trpc.ts` (which imports nothing back from
> `appRouter.ts`) breaks the cycle.

### `useTrpcClient.ts` — thin typed wrapper

The old hook returned `{ trpcClient }` and built the client itself. The package
hook returns the client **directly**. Keep a one-line wrapper so components do
not repeat the `<AppRouter>` type argument:

```ts
import { useTrpcClient as useFrameworkTrpcClient, type TrpcClient } from '@microsoft/vscode-ext-webview/react';
import { type AppRouter } from './appRouter';

export function useTrpcClient(): TrpcClient<AppRouter> {
  return useFrameworkTrpcClient<AppRouter>();
}
```

### `openAppWebview.ts` — the panel preset

The old `WebviewController` base class is replaced by the package's
`openWebview` factory. Wrap it once so each view's factory stays short and the
shared wiring (router, `trpc` instance, layout, `isBundled`) lives in one place.

```ts
import { openWebview, type WebviewController } from '@microsoft/vscode-ext-webview/host';
import { ext } from '../../extensionVariables';
import { appRouter, type AppRouter, type BaseRouterContext } from './appRouter';
import { WEBVIEW_CONFIG } from './configuration';
import { trpc } from './trpc';
import { type WebviewName } from './WebviewRegistry';

export type AppWebviewController<TConfiguration> = WebviewController<AppRouter, TConfiguration, BaseRouterContext>;

export function openAppWebview<TConfiguration>(options: {
  title: string;
  webviewName: WebviewName;
  config: TConfiguration;
  context: BaseRouterContext;
  viewColumn?: import('vscode').ViewColumn;
  icon?: import('vscode').Uri | { light: import('vscode').Uri; dark: import('vscode').Uri };
}): AppWebviewController<TConfiguration> {
  return openWebview<AppRouter, TConfiguration, BaseRouterContext>(ext.context, {
    title: options.title,
    viewType: options.webviewName,
    router: appRouter,
    trpc, // caller factory rides along — cannot be mismatched with `router`
    context: options.context,
    config: options.config,
    sourceLayout: WEBVIEW_CONFIG.bundle,
    devServerHost: WEBVIEW_CONFIG.devServerHost,
    isBundled: !!ext.isBundle, // REQUIRED: selects bundle vs tsc layout
    icon: options.icon,
    viewColumn: options.viewColumn,
  });
}
```

Two host-wiring details are easy to miss:

- **Pass `trpc`, not `createCallerFactory`.** The options bag reads
  `trpc.createCallerFactory` off the instance, so it can never be mismatched
  with `router`. `createCallerFactory` is still accepted but `@deprecated`.
- **`isBundled` is required.** It selects the `bundled` vs `dev` layout and is
  deliberately separate from the extension mode (the dev server serves the
  bundled asset name even in development).

### `WebviewRegistry.ts`

A straight move of `api/configuration/WebviewRegistry.ts`. No API change.

---

## 5. Rewrite per-view routers

Only the imports change. Point them at `./_integration/trpc` and
`./_integration/appRouter`:

```diff
- import { type BaseRouterContext } from '../../api/configuration/appRouter';
- import { publicProcedureWithTelemetry, router, type WithTelemetry } from '../../api/extension-server/trpc';
+ import { type BaseRouterContext } from '../../_integration/appRouter';
+ import { publicProcedureWithTelemetry, router, type WithTelemetry } from '../../_integration/trpc';
```

The `telemetryMiddlewareBody` returns the procedure result unchanged, so tRPC no
longer widens `ctx.telemetry` to non-optional the way the old inline middleware
did. Procedures that read telemetry narrow the context themselves — this is the
single most common per-router edit:

```ts
.query(async ({ ctx }) => {
    const myCtx = ctx as WithTelemetry<RouterContext>;
    myCtx.telemetry.properties.somethingUseful = 'value';
});
```

## 6. Rewrite controllers as panel factories (Path B)

Both starter-kit views are **construction-only** panels, so they move from
`WebviewController` subclasses to thin factory functions over `openAppWebview`:

```diff
- export class MainViewController extends WebviewController<MainViewConfig> {
-     constructor() {
-         super(ext.context, 'Webview Starter Kit', 'mainView', config);
-         this.setupTrpc({ webviewName: 'mainView', extensionVersion: version });
-     }
- }
+ export function openMainViewPanel(): AppWebviewController<MainViewConfig> {
+     return openAppWebview({
+         title: 'Webview Starter Kit',
+         webviewName: 'mainView',
+         config,
+         context: { webviewName: 'mainView', extensionVersion: version },
+     });
+ }
```

Call sites drop the `new`:

```diff
- new MainViewController();
+ openMainViewPanel();
```

The returned handle exposes `panel`, `onDisposed`, `revealToForeground`,
`dispose`, and `isDisposed` — the same lifecycle surface you had before.

> **Prefer to keep a class?** For stateful or method-rich controllers, extend
> the package's `WebviewController` instead (Path A). Its constructor now takes
> a single options bag — the same object shape `openAppWebview` builds — with
> `trpc` and the required `isBundled` flag. Both paths are supported end states.

## 7. Rewrite the webview (React) side

**`index.tsx`** — take `WithWebviewContext` and `WebviewState` from the package,
and the registry from `_integration`. The `render(viewType, vscodeApi)` contract
and the `DynamicThemeProvider` wrapper are unchanged; the framework's HTML
scaffold still injects `globalThis.l10n_bundle` and the encoded config, so
`useConfiguration` and `@vscode/l10n` keep working with no change.

```diff
- import { type WebviewName, WebviewRegistry } from './api/configuration/WebviewRegistry';
- import { type WebviewState, WithWebviewContext } from './WebviewContext';
+ import { type WebviewState, WithWebviewContext } from '@microsoft/vscode-ext-webview/react';
+ import { type WebviewName, WebviewRegistry } from './_integration/WebviewRegistry';
```

Delete your local `src/webviews/WebviewContext.tsx` — the package owns it now.

**Components** — update the import and switch to the client-first hook shape:

```diff
- import { useTrpcClient } from '../../api/webview-client/useTrpcClient';
+ import { useTrpcClient } from '../../_integration/useTrpcClient';
  // …
- const { trpcClient } = useTrpcClient();
+ const trpcClient = useTrpcClient();
```

Only if you need the webview-wide success / error / aborted stream, add
`useRpcEvents()` from `@microsoft/vscode-ext-webview/react` — it is a separate
hook now, no longer bundled into `useTrpcClient`.

## 8. Delete `src/webviews/api/`

Once nothing imports from it, remove the whole folder. The transport
(`vscodeLink`), the panel controller, the tRPC init, and `useConfiguration` are
all provided by the package.

```bash
git rm -r src/webviews/api src/webviews/WebviewContext.tsx
```

## 9. Tests

The old `vscodeLink.test.ts` tested the transport, which now lives in — and is
tested by — the package. Delete it. What you own and should test is your
**router**; drive it directly with a server-side caller (no panel or webview
needed):

```ts
import { appRouter } from './appRouter';
import { createCallerFactory } from './trpc';

const caller = createCallerFactory(appRouter)({});
const result = await caller.demo.basicView.hello();
```

Because host code now imports `vscode` as a value, map it to your manual mock in
`jest.config.js` so router/controller tests can run under Jest:

```js
moduleNameMapper: {
    '^vscode$': '<rootDir>/src/__mocks__/vscode.js',
},
```

---

## 10. Verification checklist

Run the full gate before you call the migration done:

```bash
npm run build      # tsc typecheck
npm test           # jest
npm run lint       # eslint
npm run l10n       # only if user-facing strings changed
npm run package    # full production build + VSIX
```

Then do a manual smoke test: open each view and round-trip one tRPC call
(a query, a mutation, and a subscription if you have one).

### Rename map (local copy → package)

| Old (local `api/`)                                                                              | New                                                                  |
| ----------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `api/extension-server/trpc.ts` → `initTRPC`, `router`, `publicProcedure`, `createCallerFactory` | `initWebviewTrpc<TContext>()` from `.` returns all of them           |
| `api/extension-server/trpc.ts` → inline `trpcToTelemetry` middleware                            | `telemetryMiddlewareBody` + a `TelemetryRunner` you supply (`/host`) |
| `api/extension-server/trpc.ts` → `TelemetryContext`, `WithTelemetry`                            | `ProcedureTelemetry`, `WithTelemetry<T, TTelemetry>` from `/host`    |
| `api/extension-server/WebviewController.ts`                                                     | `WebviewController` / `openWebview` from `/host`                     |
| `api/configuration/appRouter.ts` → `BaseRouterContext`                                          | extend `BaseRouterContext` from `.`                                  |
| `api/configuration/appRouter.ts`, `WebviewRegistry.ts`                                          | move to `_integration/` (consumer-owned)                             |
| `api/webview-client/vscodeLink.ts`                                                              | `vscodeLink` from `/webview` (used internally by the hooks)          |
| `api/webview-client/useTrpcClient.ts` → `{ trpcClient }`                                        | `useTrpcClient()` returns the client directly (`/react`)             |
| `api/webview-client/useConfiguration.ts`                                                        | `useConfiguration` from `/react`                                     |
| `src/webviews/WebviewContext.tsx`                                                               | `WithWebviewContext`, `WebviewState` from `/react`                   |
