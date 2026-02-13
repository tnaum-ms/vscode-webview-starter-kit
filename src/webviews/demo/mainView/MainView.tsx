/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * MainView — the primary demo webview for the VS Code Webview Starter Kit.
 *
 * This component is organized into four top-level tabs:
 *
 *   1. **Webview Messaging** — Demonstrates tRPC communication patterns between
 *      the React webview (browser) and the VS Code extension host (Node.js).
 *      Covers simple queries, long-running queries with AbortController, and
 *      real-time subscriptions via async generators.
 *
 *   2. **Common Features** — Showcases common router procedures shared across
 *      all webviews: reporting telemetry events, reporting errors, displaying
 *      VS Code error notifications, and opening external URLs.
 *
 *   3. **Theme & Fluent UI** — Showcases Fluent UI v9 components that adapt
 *      automatically when the user switches VS Code themes. The theming is
 *      powered by `DynamicThemeProvider`, which observes VS Code's
 *      `data-vscode-theme-kind` attribute and regenerates a Fluent `Theme`
 *      from the active CSS custom properties.
 *
 *   4. **Monaco Editor** — Embeds the same Monaco Editor that powers VS Code.
 *      Demonstrates the `MonacoEditor` wrapper component with VS Code theme
 *      synchronization and accessibility enhancements.
 *
 * ## Architecture overview
 *
 * ```
 * React component (this file)
 *   └─ useTrpcClient()          ← hook from useTrpcClient.ts
 *       └─ createTRPCClient()   ← @trpc/client, configured with vscodeLink
 *           └─ vscodeLink()     ← custom tRPC link that uses postMessage
 *               └─ vscodeApi.postMessage(request)  → extension host
 *               └─ window.addEventListener('message', handler) ← responses
 *
 * Extension host (Node.js)
 *   └─ WebviewController        ← receives postMessage, routes to tRPC
 *       └─ appRouter            ← root tRPC router
 *           └─ mainViewRouter   ← procedures for this view
 * ```
 *
 * ## How tRPC works in this project
 *
 * The tRPC client is created once per component mount via the `useTrpcClient()`
 * hook, which returns `{ trpcClient }`. This client is fully typed against the
 * `AppRouter` type exported from the extension host, giving you end-to-end type
 * safety for every call:
 *
 * - **Query**: `trpcClient.demo.mainView.hello.query()` — fire-and-forget request
 * - **Query with input**: `trpcClient.demo.mainView.longRunningQuery.query({ durationMs: 5000 })`
 * - **Query with abort**: pass `{ signal: abortController.signal }` as the second arg
 * - **Subscription**: `trpcClient.demo.mainView.countdown.subscribe(input, { onData, onComplete, onError })`
 *
 * All communication flows through `postMessage` / `window.addEventListener('message')`,
 * wrapped by the custom `vscodeLink` tRPC link. The extension host's `WebviewController`
 * dispatches incoming messages to the tRPC router using `createCallerFactory`.
 */

import { Tab, TabList } from '@fluentui/react-components';
import * as l10n from '@vscode/l10n';
import { useState } from 'react';
import { Header } from './components/Header';
import { CommonFeaturesTab } from './components/tabs/CommonFeaturesTab/CommonFeaturesTab';
import { MessagingTab } from './components/tabs/MessagingTab/MessagingTab';
import { MonacoTab } from './components/tabs/MonacoTab/MonacoTab';
import { ThemeTab } from './components/tabs/ThemeTab/ThemeTab';
import './mainView.scss';

// ─── Identifiers for the top-level tabs ─────────────────────────
const TAB_MESSAGING = 'messaging';
const TAB_COMMON = 'common';
const TAB_THEME = 'theme';
const TAB_MONACO = 'monaco';

export const MainView: React.FC = () => {
    // ─── Top-level tab state ────────────────────────────────────
    const [activeTab, setActiveTab] = useState<string>(TAB_MESSAGING);

    return (
        <div className="mainView">
            {/* ─── Header ──────────────────────────────────────── */}
            <Header />

            {/* ─── Top-level tabs ──────────────────────────────── */}
            <TabList
                selectedValue={activeTab}
                onTabSelect={(_, data) => setActiveTab(data.value as string)}
                size="large"
            >
                <Tab value={TAB_MESSAGING}>{l10n.t('Webview Messaging')}</Tab>
                <Tab value={TAB_COMMON}>{l10n.t('Common Features')}</Tab>
                <Tab value={TAB_THEME}>{l10n.t('Theme & Fluent UI')}</Tab>
                <Tab value={TAB_MONACO}>{l10n.t('Monaco Editor')}</Tab>
            </TabList>

            <div className="mainView__tab-content">
                {activeTab === TAB_MESSAGING && <MessagingTab />}
                {activeTab === TAB_COMMON && <CommonFeaturesTab />}
                {activeTab === TAB_THEME && <ThemeTab />}
                {activeTab === TAB_MONACO && <MonacoTab />}
            </div>
        </div>
    );
};
