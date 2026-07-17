/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Leaf module that exposes the tRPC primitives every per-view router needs.
 *
 * This file is intentionally a leaf in the module graph: it imports from the
 * framework package (`@microsoft/vscode-ext-webview`) and from a small config
 * helper, but it **must not** import from `appRouter.ts` or from any per-view
 * router. Doing so would create a circular import chain:
 *
 *   appRouter.ts  ->  mainViewRouter.ts  ->  appRouter.ts
 *
 * which produces the runtime error
 *
 *   "Cannot access 'publicProcedureWithTelemetry' before initialization"
 *
 * because the per-view router executes at the top level (using
 * `publicProcedureWithTelemetry` to declare its procedures) while
 * `appRouter.ts` is still mid-evaluation. Keeping the primitives here breaks
 * the cycle: per-view routers import value bindings from this file, `appRouter.ts`
 * also imports from this file, and nothing here imports back from `appRouter.ts`.
 *
 * What lives here:
 *   - `consoleTelemetryRunner`: the `TelemetryRunner` adapter that wraps the
 *     framework's `telemetryMiddlewareBody`. The starter kit logs to the
 *     console; swap the body of `run` for a real telemetry pipeline (for
 *     example `callWithTelemetryAndErrorHandling` from
 *     `@microsoft/vscode-azext-utils`) when you productionise.
 *   - `publicProcedureWithTelemetry`:
 *     `publicProcedure.use(telemetryMiddlewareBody(consoleTelemetryRunner, options))`.
 *     Use this instead of `publicProcedure` when you want the call tracked.
 *   - `WithTelemetry<T>`: adds the runner's `telemetry` enrichment to `ctx` so procedure
 *     code can read `ctx.telemetry.properties` / `ctx.telemetry.measurements`
 *     without an ad-hoc cast.
 *   - Re-exports of `publicProcedure`, `router`, `createCallerFactory`, and the
 *     `trpc` instance itself so per-view routers and the panel factory share a
 *     single import location.
 */

import { initWebviewTrpc, type BaseRouterContext as FrameworkBaseRouterContext } from '@microsoft/vscode-ext-webview';
import {
    getInvocationSignal,
    telemetryMiddlewareBody,
    type ProcedureTelemetry,
    type TelemetryRunner,
} from '@microsoft/vscode-ext-webview/host';
import { WEBVIEW_CONFIG } from './configuration';

/**
 * The single tRPC instance for this extension, bound to the framework's
 * `BaseRouterContext`. Every per-view router builds its procedures from the
 * `publicProcedure` / `router` exported below (procedures narrow `ctx` to their
 * richer context as needed), and the host dispatcher invokes them through this
 * instance's `createCallerFactory`.
 */
const trpc = initWebviewTrpc<FrameworkBaseRouterContext>();
const { publicProcedure, router, createCallerFactory } = trpc;

/**
 * Context enrichment contributed by `consoleTelemetryRunner`. Keep this field
 * off the base router context so procedures built from plain `publicProcedure`
 * cannot accidentally assume that telemetry middleware has run.
 *
 * The starter kit keeps the framework's minimal `ProcedureTelemetry` shape
 * (`{ properties; measurements }`). A richer integration can instead enrich
 * the context with its own field, for example an `IActionContext`:
 *
 * ```ts
 * export type WithTelemetry<T> = T & { actionContext: IActionContext };
 * ```
 */
export type WithTelemetry<T> = T & { telemetry: ProcedureTelemetry };

type TelemetryEnrichment = { telemetry: ProcedureTelemetry };

/**
 * Telemetry adapter for the framework's `telemetryMiddlewareBody`.
 *
 * The middleware body resolves the event id and delegates to this runner. The
 * runner owns the telemetry scope, contributes the telemetry bag to `ctx`,
 * classifies the result, and dispatches the populated bag — here, to the
 * console.
 *
 * **To wire your own telemetry** (e.g. Application Insights via
 * `@microsoft/vscode-azext-utils`), replace the body of `run`:
 *
 * ```ts
 * import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
 *
 * const runner: TelemetryRunner<{ actionContext: IActionContext }> = {
 *     async run(eventId, invocation, invoke) {
 *         const result = await callWithTelemetryAndErrorHandling(
 *             eventId,
 *             async (context) => {
 *                 context.errorHandling.suppressDisplay = true;
 *                 const middlewareResult = await invoke({ actionContext: context });
 *                 const aborted = getInvocationSignal(invocation.ctx)?.aborted ?? false;
 *                 if (aborted) context.telemetry.properties.result = 'Canceled';
 *                 else if (!middlewareResult.ok && middlewareResult.error) {
 *                     context.telemetry.properties.result = 'Failed';
 *                     context.telemetry.properties.error = middlewareResult.error.name ?? '';
 *                 }
 *                 return middlewareResult;
 *             },
 *         );
 *         if (!result) throw new Error(`No telemetry result for ${eventId}`);
 *         return result;
 *     },
 * };
 * ```
 */
const consoleTelemetryRunner: TelemetryRunner<TelemetryEnrichment> = {
    async run(eventId, invocation, invoke) {
        const telemetry: ProcedureTelemetry = { properties: {}, measurements: {} };
        const startTime = performance.now();

        const result = await invoke({ telemetry });
        telemetry.measurements.durationMs = performance.now() - startTime;

        const aborted = getInvocationSignal(invocation.ctx)?.aborted ?? false;
        if (aborted) {
            telemetry.properties.aborted = 'true';
            telemetry.properties.result = 'Canceled';
        } else if (!result.ok && result.error) {
            telemetry.properties.result = 'Failed';
            telemetry.properties.error = result.error.name ?? '';
            telemetry.properties.errorMessage = result.error.message ?? '';
        }

        // Default: log to the extension-host console. Replace this runner with
        // one that forwards `telemetry` to your analytics pipeline.
        console.log(`[telemetry] ${eventId} (${telemetry.measurements.durationMs}ms)`, telemetry.properties);

        return result;
    },
};

/**
 * Base procedure that automatically attaches telemetry context.
 *
 * Use this instead of {@link publicProcedure} when you want every call to be
 * tracked. The `telemetry` object is available on `ctx` inside your procedure
 * handlers (cast with `WithTelemetry<YourContext>`).
 */
export const publicProcedureWithTelemetry = publicProcedure.use(
    telemetryMiddlewareBody(consoleTelemetryRunner, {
        buildEventId: ({ type, path }) => `${WEBVIEW_CONFIG.telemetry.rpcEventPrefix}.${type}.${path}`,
    }),
);

// Re-export the tRPC instance, the unprotected procedure builder, the router
// factory, and the caller factory so per-view routers have a single import
// location for everything they need. Panel factories pass `trpc` to
// `openAppWebview`, so the caller factory rides along with the instance and can
// never be mismatched with the router.
export { createCallerFactory, publicProcedure, router, trpc };
