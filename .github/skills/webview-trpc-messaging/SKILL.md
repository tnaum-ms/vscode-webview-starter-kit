---
name: webview-trpc-messaging
description: Implements tRPC-based communication between VS Code extension host and React webviews using the @microsoft/vscode-ext-webview package. Use when creating new webview procedures (queries, mutations, subscriptions), adding a new webview router, opening a webview panel (openAppWebview / WebviewController), using the tRPC client from React components, applying the telemetry middleware body, or supporting AbortSignal-based cancellation in webview operations.
---

# Webview tRPC Messaging

Type-safe RPC communication between the VS Code extension host (server) and React webviews (client) using tRPC.

## Architecture Overview

The tRPC transport, panel facade, and React hooks are provided by the
[`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview)
package (imported via `.`, `/host`, `/webview`, `/react`). This repository owns
only the consumer glue in `src/webviews/_integration/`.

```
React Webview (client)                    Extension Host (server)
─────────────────────                     ──────────────────────
useTrpcClient() hook                      openWebview / WebviewController
  └─ vscodeLink ──── postMessage ────►       └─ dispatches against appRouter
       (from the package)              ◄─────    via trpc.createCallerFactory
```

**Key files** (read as needed for implementation details):

| File                                           | Purpose                                                                                            |
| ---------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/webviews/_integration/trpc.ts`            | tRPC init (`initWebviewTrpc`), `publicProcedure`, `publicProcedureWithTelemetry`, telemetry runner |
| `src/webviews/_integration/appRouter.ts`       | Root router bundling all view routers + `commonRouter`; flavoured `BaseRouterContext`              |
| `src/webviews/_integration/openAppWebview.ts`  | Preset over the package's `openWebview` factory (fixed wiring: router, `trpc`, layout)             |
| `src/webviews/_integration/useTrpcClient.ts`   | Thin wrapper over the package's `useTrpcClient`, pre-typed to `AppRouter`                          |
| `src/webviews/_integration/WebviewRegistry.ts` | Maps webview names → React components; source of the `WebviewName` union                           |
| `@microsoft/vscode-ext-webview/host`           | `openWebview`, `WebviewController`, `telemetryMiddlewareBody`, `TelemetryRunner` (package)         |
| `@microsoft/vscode-ext-webview/webview`        | `vscodeLink`, `errorLink`, `connectTrpc` — the transport (package)                                 |

## Creating a New Router

Each webview maintains its own router. Follow this pattern:

### 1. Define the router context

Extend `BaseRouterContext` with view-specific fields:

```typescript
// src/webviews/myView/myViewRouter.ts
import { type BaseRouterContext } from '../../_integration/appRouter';

export type RouterContext = BaseRouterContext & {
  clusterId: string;
  viewId: string;
  databaseName: string;
  // add view-specific fields
};
```

### 2. Define procedures

```typescript
import { z } from 'zod';
import { publicProcedureWithTelemetry, router, type WithTelemetry } from '../../_integration/trpc';

export const myViewRouter = router({
  // Query with telemetry (preferred for operations that touch external services)
  getData: publicProcedureWithTelemetry.input(z.object({ id: z.string() })).query(async ({ input, ctx }) => {
    const myCtx = ctx as WithTelemetry<RouterContext>;
    // The consumer telemetry runner contributed myCtx.telemetry for this call.
    // myCtx.signal is the AbortSignal for cancellation
    return { data: 'result' };
  }),

  // Mutation without telemetry (rare, use for fire-and-forget)
  doAction: publicProcedure.input(z.string()).mutation(({ input }) => {
    // lightweight operation
  }),
});
```

### 3. Register in appRouter

```typescript
// src/webviews/_integration/appRouter.ts
import { myViewRouter } from '../myView/myViewRouter';

export const appRouter = router({
  common: commonRouter,
  myView: myViewRouter, // <-- add here
});
```

### 4. Create the panel factory

Construction-only panels open through the `openAppWebview` preset (Path B). The
returned handle exposes `panel`, `onDisposed`, `revealToForeground`, `dispose`,
and `isDisposed`.

```typescript
// src/webviews/myView/myViewController.ts
import { type AppWebviewController, openAppWebview } from '../../_integration/openAppWebview';
import { type RouterContext } from './myViewRouter';

export function openMyViewPanel(initialData: MyViewConfig): AppWebviewController<MyViewConfig> {
  const context: RouterContext = {
    webviewName: 'myView',
    clusterId: initialData.clusterId,
    viewId: initialData.viewId,
  };

  return openAppWebview({
    title,
    webviewName: 'myViewName', // registry key
    config: initialData,
    context,
  });
}
```

> **Stateful controllers?** For panels with instance state or methods other
> code calls, extend the package's `WebviewController` instead (Path A). Its
> constructor takes a single options bag with `router`, `trpc`, `context`,
> `config`, `sourceLayout`, and the required `isBundled` flag — the same object
> `openAppWebview` builds.

> **Important:** The `webviewName` passed to `openAppWebview` is the **registry key** (must match a key in `WebviewRegistry`, e.g. `myViewName`). The `webviewName` in the tRPC context is a **telemetry label** used in telemetry event names (e.g. `myView`). These are intentionally different values — do not confuse them.

### 5. Register in WebviewRegistry

Add your React component to the registry. The key must match the `webviewName` passed to `openAppWebview`. The `WebviewName` type (exported from the same file) ensures compile-time validation of webview names.

```typescript
// src/webviews/_integration/WebviewRegistry.ts
import { MyView } from '../myView/MyView';

export const WebviewRegistry = {
  myViewName: MyView, // <-- add your entry
} as const;

export type WebviewName = keyof typeof WebviewRegistry;
```

## Telemetry: `publicProcedure` vs `publicProcedureWithTelemetry`

| Base                           | When to use                                                                  | Runner enrichment                         |
| ------------------------------ | ---------------------------------------------------------------------------- | ----------------------------------------- |
| `publicProcedure`              | Fire-and-forget, no external calls, telemetry reported separately            | Not added                                 |
| `publicProcedureWithTelemetry` | **Default choice.** Any procedure touching DB, network, or user-visible work | Added by this repository's telemetry runner |

`publicProcedureWithTelemetry` (defined in `_integration/trpc.ts`) wires the
package's curried `telemetryMiddlewareBody` onto a generic
`TelemetryRunner<TEnrichment>`. The body resolves the event id, merges the
runner's enrichment into `ctx`, and returns the procedure result unchanged. The
runner owns timing, cancellation/failure classification, and dispatch. The
starter kit enriches `ctx` with a plain `telemetry` bag and logs it to the
console; an Application Insights integration can instead contribute an
`actionContext` and call `callWithTelemetryAndErrorHandling`.

Access telemetry safely:

```typescript
const myCtx = ctx as WithTelemetry<RouterContext>;
myCtx.telemetry.properties.myCustomProp = 'value';
myCtx.telemetry.measurements.itemCount = items.length;
```

## AbortSignal Support

Every tRPC operation (query, mutation, subscription) receives its own `AbortController`. Cancellation flows:

```
Client (React)                              Server (Extension Host)
──────────────                              ──────────────────────
// Queries/Mutations:
ac = new AbortController()
trpcClient.myProc.query(input,
  { signal: ac.signal })
ac.abort()  →  sends 'abort' msg  →  abortController.abort()
                                        → ctx.signal.aborted = true

// Subscriptions:
sub = trpcClient.mySub.subscribe(...)
sub.unsubscribe()  →  'subscription.stop'  →  abortController.abort()
```

### Using abort in procedures

```typescript
// Pass signal to APIs that accept it (fetch, database drivers, etc.)
getData: publicProcedureWithTelemetry
    .input(z.object({ filter: z.record(z.unknown()) }))
    .query(async ({ input, ctx }) => {
        const myCtx = ctx as WithTelemetry<RouterContext>;

        // Option 1: Pass to APIs that accept AbortSignal
        const response = await fetch(url, { signal: myCtx.signal });

        // Option 2: Manual check in loops
        for (const item of items) {
            if (myCtx.signal?.aborted) return;
            await processItem(item);
        }
    }),
```

### Client-side abort

```tsx
const trpcClient = useTrpcClient();
const abortControllerRef = useRef<AbortController>();

const runQuery = async () => {
  abortControllerRef.current?.abort(); // cancel previous
  const ac = new AbortController();
  abortControllerRef.current = ac;

  const result = await trpcClient.myView.myQuery.query(input, { signal: ac.signal });
};
```

The starter kit's telemetry runner checks the invocation signal after
`invoke(...)` returns and classifies an aborted call as `Canceled`. The package
middleware body intentionally does not impose an outcome policy.

## Subscriptions

Subscriptions stream multiple values from server to client using async generators:

```typescript
// Server (router)
streamData: publicProcedureWithTelemetry
    .input(z.object({ batchSize: z.number() }))
    .subscription(async function* ({ input, ctx }) {
        const myCtx = ctx as WithTelemetry<RouterContext>;

        for (let i = 0; i < total; i += input.batchSize) {
            if (myCtx.signal?.aborted) return; // check before each yield
            const batch = await fetchBatch(i, input.batchSize);
            yield batch;
        }
    }),

// Client (React)
const sub = trpcClient.myView.streamData.subscribe(
    { batchSize: 100 },
    {
        onData(batch) { /* handle each batch */ },
        onComplete() { /* all done */ },
        onError(err) { /* handle error */ },
    },
);

// To stop:
sub.unsubscribe();
```

## Client-Side Hook Usage

```tsx
import { useTrpcClient } from '../_integration/useTrpcClient';
import { useConfiguration } from '@microsoft/vscode-ext-webview/react';

export const MyComponent = () => {
  const trpcClient = useTrpcClient();
  const config = useConfiguration<MyViewConfig>();

  useEffect(() => {
    trpcClient.myView.getData.query({ id: config.documentId }).then(setData);
  }, []);
};
```

`useConfiguration<T>()` retrieves the initial config passed to `openAppWebview` (serialized via `encodeURIComponent(JSON.stringify(...))`).

## Common Pitfalls

- **Never use `any`** in procedure context casts — use the consumer-owned `WithTelemetry<RouterContext>` alias or `RouterContext`
- **Always prefer `publicProcedureWithTelemetry`** unless you have a specific reason not to
- **Do not add runner enrichment to the base context** when plain `publicProcedure` is also used; add it only through `WithTelemetry<T>`
- **Always check `myCtx.signal?.aborted`** in long-running loops — not checking causes wasted work after client cancels
- **Do not mutate the shared `context` object** — the framework's dispatcher clones it per-operation already, but router code should treat `ctx` as read-only
- **Input validation uses `zod`** — always define `.input(z.object({...}))` for type safety
- **The `commonRouter`** handles cross-cutting concerns (error reporting, telemetry events, surveys, URL opening) — do not duplicate these in view-specific routers
