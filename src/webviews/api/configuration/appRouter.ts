/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is a minimal tRPC server
 */
import * as vscode from 'vscode';
import { z } from 'zod';
import { openUrl } from '../../../utils/openUrl';
import { basicViewRouter } from '../../demo/basicView/basicViewRouter';
import { mainViewRouter } from '../../demo/mainView/mainViewRouter';
import { publicProcedure, router } from '../extension-server/trpc';

/**
 * You can read more about tRPC here:
 * https://trpc.io/docs/quickstart
 *
 * We're bundling routers here; each webview maintains its own router.
 * Here is where we bundle them all together.
 *
 * There is one router called 'commonRouter'. It has procedures that are shared across all webviews.
 */

export type BaseRouterContext = {
    /**
     * Label used in telemetry event names to identify the source webview
     * (e.g. `webviewStarter.webview.event.${webviewName}.${eventName}`).
     */
    webviewName: string;

    /**
     * Telemetry context provided by the telemetry middleware.
     * Available when using `publicProcedureWithTelemetry`.
     */
    telemetry?: { properties: Record<string, string>; measurements: Record<string, number> };

    /**
     * AbortSignal used to cancel in-flight operations (queries, mutations, and subscriptions).
     *
     * Populated by `WebviewController` when handling incoming tRPC messages. Each operation
     * receives its own `AbortController`; when the client sends an `'abort'` (for queries/mutations)
     * or `'subscription.stop'` (for subscriptions) message, the controller calls `.abort()` on it.
     *
     * Router procedures can use this signal to gracefully cancel long-running work:
     *
     * ```ts
     * .query(async ({ ctx }) => {
     *     if (ctx.signal?.aborted) return;
     * })
     * ```
     */
    signal?: AbortSignal;
};

/**
 * Common router with procedures shared across all webviews.
 *
 * `reportEvent` and `reportError` currently log to the console. To wire them up
 * to a real telemetry pipeline (e.g. Application Insights via `@microsoft/vscode-azext-utils`),
 * replace the `console.*` calls with `callWithTelemetryAndErrorHandling`.
 *
 * **Production example — `reportEvent` with `@microsoft/vscode-azext-utils`:**
 *
 * ```typescript
 * import { callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
 *
 * reportEvent: publicProcedure
 *     .input(
 *         z.object({
 *             eventName: z.string(),
 *             properties: z.optional(z.record(z.string(), z.string())),
 *             measurements: z.optional(z.record(z.string(), z.number())),
 *         }),
 *     )
 *     .mutation(({ input, ctx }) => {
 *         const myCtx = ctx as BaseRouterContext;
 *
 *         void callWithTelemetryAndErrorHandling<void>(
 *             `myExtension.webview.event.${myCtx.webviewName}.${input.eventName}`,
 *             (context) => {
 *                 context.errorHandling.suppressDisplay = true;
 *                 Object.assign(context.telemetry.properties, input.properties ?? {});
 *                 Object.assign(context.telemetry.measurements, input.measurements ?? {});
 *             },
 *         );
 *     }),
 * ```
 *
 * **Production example — `reportError` with `@microsoft/vscode-azext-utils`:**
 *
 * ```typescript
 * reportError: publicProcedure
 *     .input(
 *         z.object({
 *             message: z.string(),
 *             stack: z.string(),
 *             componentStack: z.optional(z.string()),
 *             properties: z.optional(z.record(z.string(), z.string())),
 *         }),
 *     )
 *     .mutation(({ input, ctx }) => {
 *         const myCtx = ctx as BaseRouterContext;
 *
 *         void callWithTelemetryAndErrorHandling<void>(
 *             `myExtension.webview.error.${myCtx.webviewName}`,
 *             (context) => {
 *                 context.errorHandling.suppressDisplay = true;
 *                 Object.assign(context.telemetry.properties, input.properties ?? {});
 *
 *                 const newError = new Error(input.message);
 *                 // If it's a rendering error in the webview, swap the stack with the
 *                 // componentStack which is more helpful
 *                 newError.stack = input.componentStack ?? input.stack;
 *                 throw newError;
 *             },
 *         );
 *     }),
 * ```
 */
const commonRouter = router({
    reportEvent: publicProcedure
        .input(
            z.object({
                eventName: z.string(),
                properties: z.optional(z.record(z.string(), z.string())),
                measurements: z.optional(z.record(z.string(), z.number())),
            }),
        )
        .mutation(({ input, ctx }) => {
            const myCtx = ctx as BaseRouterContext;
            // Replace with callWithTelemetryAndErrorHandling for production telemetry (see examples above)
            console.log(
                `[event] ${myCtx.webviewName}.${input.eventName}`,
                input.properties ?? {},
                input.measurements ?? {},
            );
        }),
    reportError: publicProcedure
        .input(
            z.object({
                message: z.string(),
                stack: z.string(),
                componentStack: z.optional(z.string()),
                properties: z.optional(z.record(z.string(), z.string())),
            }),
        )
        .mutation(({ input, ctx }) => {
            const myCtx = ctx as BaseRouterContext;
            // Replace with callWithTelemetryAndErrorHandling for production telemetry (see examples above)
            console.error(
                `[error] ${myCtx.webviewName}: ${input.message}`,
                input.componentStack ?? input.stack,
                input.properties ?? {},
            );
        }),
    displayErrorMessage: publicProcedure
        .input(
            z.object({
                message: z.string(),
                modal: z.boolean(),
                cause: z.string(),
            }),
        )
        .mutation(({ input }) => {
            let message = input.message;
            if (input.cause && !input.modal) {
                message += ` (${input.cause})`;
            }

            void vscode.window.showErrorMessage(message, {
                modal: input.modal,
                detail: input.modal ? input.cause : undefined,
            });
        }),
    openUrl: publicProcedure
        .input(
            z.object({
                url: z.string(),
            }),
        )
        .mutation(async ({ input }) => {
            await openUrl(input.url);
        }),
});

export const appRouter = router({
    common: commonRouter,
    demo: {
        basicView: basicViewRouter,
        mainView: mainViewRouter,
    },
});

// Export type router type signature, this is used by the client.
export type AppRouter = typeof appRouter;
