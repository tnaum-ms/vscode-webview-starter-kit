/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Root tRPC router for the extension. Bundles each webview's router together
 * with a shared `commonRouter` exposing cross-webview procedures (telemetry
 * helpers, dialog helpers, `openUrl`).
 *
 * The tRPC primitives (`publicProcedure`, `publicProcedureWithTelemetry`,
 * `router`, `WithTelemetry`) live in `./trpc.ts`, a leaf module that this file
 * and every per-view router import from. Keeping them in a separate module
 * avoids a circular import: `appRouter.ts` imports the per-view routers, so the
 * per-view routers must not import value bindings back from `appRouter.ts`.
 *
 * You can read more about tRPC here: https://trpc.io/docs/quickstart
 */

import { type BaseRouterContext as FrameworkBaseRouterContext } from '@microsoft/vscode-ext-webview';
import * as vscode from 'vscode';
import { z } from 'zod';
import { openUrl } from '../../utils/openUrl';
import { basicViewRouter } from '../demo/basicView/basicViewRouter';
import { mainViewRouter } from '../demo/mainView/mainViewRouter';
import { WEBVIEW_CONFIG } from './configuration';
import { publicProcedure, router } from './trpc';

/**
 * Starter-kit-flavoured router context. Extends the framework's
 * `BaseRouterContext` (from `@microsoft/vscode-ext-webview`, which already
 * declares `telemetry?` and `signal?`) with the fields every procedure in this
 * extension needs. Inheriting those optional slots keeps the context shape
 * in lock step with the framework: if the framework adds a field, it lands here
 * automatically without an edit in this file.
 *
 * The framework does not populate `telemetry` itself. Instrumented procedures
 * use this repository's `WithTelemetry<T>` alias, which reflects the field
 * contributed per call by `consoleTelemetryRunner`.
 *
 * The `signal?` slot inherited from the framework is populated by the
 * framework's `WebviewController` when handling incoming tRPC messages. Each
 * operation receives its own `AbortController`; when the client sends an
 * `'abort'` (for queries/mutations) or `'subscription.stop'` (for
 * subscriptions) message, the controller calls `.abort()` on it. Router
 * procedures can use this signal to gracefully cancel long-running work.
 */
export type BaseRouterContext = FrameworkBaseRouterContext & {
    /**
     * Label used in telemetry event names to identify the source webview
     * (combined with `WEBVIEW_CONFIG.telemetry.webviewEventPrefix` to form the
     * final event name, e.g. `webviewStarter.webview.event.${webviewName}.${eventName}`).
     */
    webviewName: string;
};

/**
 * Common router with procedures shared across all webviews.
 *
 * `reportEvent` and `reportError` currently log to the console. To wire them up
 * to a real telemetry pipeline (e.g. Application Insights via
 * `@microsoft/vscode-azext-utils`), replace the `console.*` calls with
 * `callWithTelemetryAndErrorHandling`.
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
            // Replace with callWithTelemetryAndErrorHandling for production telemetry.
            console.log(
                `[event] ${WEBVIEW_CONFIG.telemetry.webviewEventPrefix}.${myCtx.webviewName}.${input.eventName}`,
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
            // Replace with callWithTelemetryAndErrorHandling for production telemetry.
            console.error(
                `[error] ${WEBVIEW_CONFIG.telemetry.webviewErrorPrefix}.${myCtx.webviewName}: ${input.message}`,
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
