/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is your entry point to setup the root configuration for tRPC on the server.
 * - `initTRPC` should only be used once per app.
 * - We export only the functionality that we use so we can enforce which base procedures should be used
 *
 * Learn how to create protected base procedures and other things below:
 * @see https://trpc.io/docs/v11/router
 * @see https://trpc.io/docs/v11/procedures
 */

import { initTRPC } from '@trpc/server';
import { type BaseRouterContext } from '../configuration/appRouter';

/**
 * Telemetry context interface.
 *
 * Replace this with your telemetry library's context type. For example, if you
 * use `@microsoft/vscode-azext-utils` with Application Insights, you can import
 * `ITelemetryContext` from that package and use it directly here.
 */
export interface TelemetryContext {
    properties: Record<string, string>;
    measurements: Record<string, number>;
}

/**
 * Helper type: transforms a context type to have required (non-optional) telemetry.
 * Use with `publicProcedureWithTelemetry` to get type-safe telemetry access.
 */
export type WithTelemetry<T extends { telemetry?: unknown }> = T & {
    telemetry: TelemetryContext;
};

/**
 * Initialization of tRPC backend.
 *
 * Please note, this should be done only once per backend.
 */
const t = initTRPC.create();

/**
 * Unprotected procedure
 **/

export const createCallerFactory = t.createCallerFactory;

export const router = t.router;
export const publicProcedure = t.procedure;

/**
 * Telemetry middleware — logs every tRPC call with contextual metadata.
 *
 * **How to integrate your own telemetry:**
 *
 * This middleware is the single place where you plug in your telemetry library.
 * The default implementation below uses `console.log` so the starter kit works
 * out-of-the-box without any external dependency. Replace the body with your
 * preferred library.
 *
 * **Example: using `@microsoft/vscode-azext-utils` with Application Insights**
 *
 * ```typescript
 * import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
 *
 * const trpcToTelemetry = t.middleware(async (opts) => {
 *     const result = await callWithTelemetryAndErrorHandling(
 *         `myExtension.rpc.${opts.type}.${opts.path}`,
 *         async (context) => {
 *             context.errorHandling.suppressDisplay = true;
 *
 *             const result = await opts.next({
 *                 ctx: { ...opts.ctx, telemetry: context.telemetry },
 *             });
 *
 *             const signal = (opts.ctx as BaseRouterContext).signal;
 *             if (signal?.aborted) {
 *                 context.telemetry.properties.aborted = 'true';
 *                 context.telemetry.properties.result = 'Canceled';
 *             }
 *
 *             if (!result.ok) {
 *                 if (!signal?.aborted) {
 *                     context.telemetry.properties.result = 'Failed';
 *                 }
 *                 context.telemetry.properties.error = result.error.name;
 *                 context.telemetry.properties.errorMessage = result.error.message;
 *             }
 *
 *             return result;
 *         },
 *     );
 *
 *     if (!result) {
 *         throw new Error(`No result from tRPC call: ${opts.type} ${opts.path}`);
 *     }
 *     return result;
 * });
 * ```
 */
const trpcToTelemetry = t.middleware(async (opts) => {
    const telemetry: TelemetryContext = {
        properties: {},
        measurements: {},
    };

    const startTime = Date.now();

    const result = await opts.next({
        ctx: {
            ...opts.ctx,
            telemetry,
        },
    });

    const durationMs = Date.now() - startTime;
    telemetry.measurements.durationMs = durationMs;

    // Check if the operation was aborted via AbortSignal
    const signal = (opts.ctx as BaseRouterContext).signal;
    if (signal?.aborted) {
        telemetry.properties.aborted = 'true';
        telemetry.properties.result = 'Canceled';
    }

    if (!result.ok) {
        if (!signal?.aborted) {
            telemetry.properties.result = 'Failed';
        }
        telemetry.properties.error = result.error.name;
        telemetry.properties.errorMessage = result.error.message;
    }

    // Default: log to console. Replace with your telemetry sink.
    console.log(`[tRPC] ${opts.type} ${opts.path} (${durationMs}ms)`, telemetry.properties);

    return result;
});

/**
 * Base procedure that automatically attaches telemetry context.
 *
 * Use this instead of `publicProcedure` when you want every call to be
 * tracked. The `telemetry` object is available on `ctx` inside your
 * procedure handlers (cast with `WithTelemetry<YourContext>`).
 */
export const publicProcedureWithTelemetry = publicProcedure.use(trpcToTelemetry);
