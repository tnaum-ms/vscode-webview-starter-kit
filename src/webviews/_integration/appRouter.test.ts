/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { openUrl } from '../../utils/openUrl';
import { appRouter } from './appRouter';
import { createCallerFactory } from './trpc';

// Isolate the router from the VS Code `openExternal` plumbing: the test asserts
// that the `common.openUrl` procedure forwards its input to the utility, which
// is the consumer-owned wiring worth covering here.
jest.mock('../../utils/openUrl', () => ({
    openUrl: jest.fn<Promise<void>, [string]>().mockResolvedValue(undefined),
}));

/**
 * Reference test for the `_integration` layer.
 *
 * The tRPC transport itself (the `vscodeLink` / `postMessage` bridge) lives in
 * and is tested by `@microsoft/vscode-ext-webview`. What a consumer owns — and
 * therefore what is worth testing here — is the router. `createCallerFactory`
 * (read off the shared `trpc` instance) builds a server-side caller so
 * procedures can be invoked directly, with no webview or panel involved.
 */
describe('appRouter', () => {
    // Build a server-side caller for the root router. The context carries only
    // the framework's optional fields for these procedures; per-view procedures
    // narrow `ctx` to their richer context as needed.
    const createCaller = createCallerFactory(appRouter);
    const caller = createCaller({});

    it('demo.basicView.hello returns a greeting from the extension host', async () => {
        const result = await caller.demo.basicView.hello();
        expect(result.message).toContain('Hello');
    });

    it('demo.mainView.hello returns a greeting and an ISO timestamp', async () => {
        const result = await caller.demo.mainView.hello();
        expect(result.message).toContain('Hello');
        expect(() => new Date(result.timestamp)).not.toThrow();
    });

    it('demo.mainView.throwOnDemand rejects when asked to throw', async () => {
        await expect(caller.demo.mainView.throwOnDemand({ shouldThrow: true })).rejects.toThrow();

        const ok = await caller.demo.mainView.throwOnDemand({ shouldThrow: false });
        expect(ok.status).toBe('ok');
    });

    it('common.openUrl forwards the URL to the openUrl utility', async () => {
        const openUrlMock = openUrl as jest.MockedFunction<typeof openUrl>;
        openUrlMock.mockClear();

        await caller.common.openUrl({ url: 'https://example.com' });

        expect(openUrlMock).toHaveBeenCalledWith('https://example.com');
    });
});
