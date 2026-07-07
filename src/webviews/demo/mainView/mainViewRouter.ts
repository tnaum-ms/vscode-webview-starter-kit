/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as l10n from '@vscode/l10n';
import * as vscode from 'vscode';
import { z } from 'zod';
import { type BaseRouterContext } from '../../_integration/appRouter';
import { publicProcedureWithTelemetry, router, type WithTelemetry } from '../../_integration/trpc';

export type RouterContext = BaseRouterContext & {
    extensionVersion: string;
};

/**
 * Demo router — showcases tRPC patterns you can reuse in your own views.
 *
 * All procedures here use `publicProcedureWithTelemetry` instead of the plain
 * `publicProcedure`. This means every call is automatically logged via the
 * telemetry middleware defined in `trpc.ts`. See that file for instructions
 * on plugging in your own telemetry library (e.g. Application Insights via
 * `@microsoft/vscode-azext-utils`).
 *
 * Inside procedure handlers, cast `ctx` to `WithTelemetry<RouterContext>` to
 * get type-safe access to the `telemetry` field contributed by this repository's
 * telemetry runner.
 */
export const mainViewRouter = router({
    /**
     * Opens the Basic View webview panel.
     * Demonstrates how a procedure can trigger VS Code commands from the extension host.
     */
    openBasicView: publicProcedureWithTelemetry.mutation(async () => {
        await vscode.commands.executeCommand('webviewStarter.openBasicView');
    }),

    /**
     * Simple query — returns a greeting from the extension host.
     * Demonstrates the most basic tRPC query pattern.
     */
    hello: publicProcedureWithTelemetry.query(async () => {
        return {
            message: l10n.t('Hello from the extension host!'),
            timestamp: new Date().toISOString(),
        };
    }),

    /**
     * Long-running query with abort support.
     *
     * Simulates a long-running operation by sleeping in small increments.
     * The client can abort this query mid-flight using an AbortController.
     *
     * Key pattern: check `ctx.signal?.aborted` in each loop iteration
     * to respond to client-side cancellation promptly.
     */
    longRunningQuery: publicProcedureWithTelemetry
        .input(
            z.object({
                durationMs: z.number().min(1000).max(30000),
            }),
        )
        .query(async ({ input, ctx }) => {
            const myCtx = ctx as WithTelemetry<RouterContext>;
            const steps = Math.ceil(input.durationMs / 500);

            for (let i = 0; i < steps; i++) {
                // Check if the client has aborted before each step
                if (myCtx.signal?.aborted) {
                    return { result: l10n.t('Cancelled'), completed: false, elapsedMs: i * 500 };
                }
                await new Promise((resolve) => setTimeout(resolve, 500));
            }

            return {
                result: l10n.t('Done! Operation completed successfully.'),
                completed: true,
                elapsedMs: input.durationMs,
            };
        }),

    /**
     * Subscription — streams a countdown from `total` to 0.
     *
     * Demonstrates the tRPC subscription pattern using async generators.
     * Each yielded value is sent to the client as it's produced.
     *
     * The client can unsubscribe at any time, which triggers `ctx.signal.aborted`.
     *
     * Usage on the client:
     * ```typescript
     * const sub = trpcClient.demo.mainView.countdown.subscribe(
     *   { from: 10, intervalMs: 1000 },
     *   {
     *     onData(data) { console.log(data.current); },
     *     onComplete() { console.log('Done!'); },
     *   },
     * );
     * // To stop early:
     * sub.unsubscribe();
     * ```
     */
    countdown: publicProcedureWithTelemetry
        .input(z.object({ from: z.number(), intervalMs: z.number() }))
        .subscription(async function* ({ input, ctx }) {
            const myCtx = ctx as WithTelemetry<RouterContext>;

            for (let i = input.from; i >= 0; i--) {
                if (myCtx.signal?.aborted) {
                    return;
                }

                yield { current: i, total: input.from };

                if (i > 0) {
                    await new Promise((resolve) => setTimeout(resolve, input.intervalMs));
                }
            }
        }),

    /**
     * Error handling demo — conditionally throws or succeeds.
     *
     * The client passes `{ shouldThrow: true/false }` to control whether
     * the procedure throws an error or returns a success result. This lets
     * developers see how tRPC errors propagate from the extension host back
     * to the webview and how to handle them gracefully in the UI.
     *
     * Key patterns demonstrated:
     * - tRPC errors are serialized over postMessage and deserialized on the client
     * - Wrapping `.query()` in try/catch gives you a typed error object
     * - The error includes the original message from the server
     */
    throwOnDemand: publicProcedureWithTelemetry
        .input(
            z.object({
                shouldThrow: z.boolean(),
            }),
        )
        .query(async ({ input }) => {
            if (input.shouldThrow) {
                throw new Error(
                    l10n.t('This is a deliberate error thrown by the extension host to demonstrate error handling.'),
                );
            }

            return {
                status: 'ok' as const,
                message: l10n.t('Success! The procedure completed without errors.'),
                timestamp: new Date().toISOString(),
            };
        }),
});
