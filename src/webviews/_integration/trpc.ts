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
 *     `publicProcedure.use((opts) => telemetryMiddlewareBody(opts, consoleTelemetryRunner))`.
 *     Use this instead of `publicProcedure` when you want the call tracked.
 *   - `WithTelemetry<T>`: re-types the `telemetry` slot on `ctx` so procedure
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
    type WithTelemetry as FrameworkWithTelemetry,
    type ProcedureTelemetry,
    type TelemetryRunner,
} from '@microsoft/vscode-ext-webview/host';

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
 * Helper that transforms a context type to have a required (non-optional)
 * telemetry slot. Use with `publicProcedureWithTelemetry` to get type-safe
 * access to `ctx.telemetry` inside procedure handlers.
 *
 * The starter kit keeps the framework's minimal `ProcedureTelemetry` shape
 * (`{ properties; measurements }`). If you adopt a richer telemetry context
 * (for example `ITelemetryContext` from `@microsoft/vscode-azext-utils`), pass
 * it as the second type argument instead:
 *
 * ```ts
 * export type WithTelemetry<T extends { telemetry?: unknown }> =
 *     FrameworkWithTelemetry<T, ITelemetryContext>;
 * ```
 */
export type WithTelemetry<T extends { telemetry?: unknown }> = FrameworkWithTelemetry<T, ProcedureTelemetry>;

/**
 * Telemetry adapter for the framework's `telemetryMiddlewareBody`.
 *
 * The body owns the reusable orchestration (timing, `Canceled` / `Failed`
 * classification, error name + message) and populates the telemetry bag it
 * hands to `execute`. This runner establishes the scope and dispatches the
 * populated bag — here, to the console.
 *
 * **To wire your own telemetry** (e.g. Application Insights via
 * `@microsoft/vscode-azext-utils`), replace the body of `run`:
 *
 * ```ts
 * import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
 *
 * const runner: TelemetryRunner = {
 *     async run(invocation, execute) {
 *         const result = await callWithTelemetryAndErrorHandling(
 *             `${WEBVIEW_CONFIG.telemetry.rpcEventPrefix}.${invocation.type}.${invocation.path}`,
 *             async (context) => {
 *                 context.errorHandling.suppressDisplay = true;
 *                 return execute(context.telemetry as unknown as ProcedureTelemetry);
 *             },
 *         );
 *         if (!result) throw new Error(`No telemetry result for ${invocation.path}`);
 *         return result;
 *     },
 * };
 * ```
 */
const consoleTelemetryRunner: TelemetryRunner = {
    async run(invocation, execute) {
        const telemetry: ProcedureTelemetry = { properties: {}, measurements: {} };

        // `execute` drives the procedure. The middleware body records duration
        // and the `Canceled` / `Failed` outcome into `telemetry` before it
        // resolves, so there is nothing extra to compute here.
        const result = await execute(telemetry);

        // Leave aborted calls classified as 'Canceled' by the body; we only
        // read the populated bag out for logging.
        const aborted = getInvocationSignal(invocation.ctx)?.aborted ?? false;
        if (aborted) {
            telemetry.properties.aborted = 'true';
        }

        // Default: log to the extension-host console. Replace this runner with
        // one that forwards `telemetry` to your analytics pipeline.
        console.log(
            `[telemetry] ${invocation.type} ${invocation.path} (${telemetry.measurements.durationMs ?? 0}ms)`,
            telemetry.properties,
        );

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
export const publicProcedureWithTelemetry = publicProcedure.use((opts) =>
    telemetryMiddlewareBody(opts, consoleTelemetryRunner),
);

// Re-export the tRPC instance, the unprotected procedure builder, the router
// factory, and the caller factory so per-view routers have a single import
// location for everything they need. Panel factories pass `trpc` to
// `openAppWebview`, so the caller factory rides along with the instance and can
// never be mismatched with the router.
export { createCallerFactory, publicProcedure, router, trpc };
