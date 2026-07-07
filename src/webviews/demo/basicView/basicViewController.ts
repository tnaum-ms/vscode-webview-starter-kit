/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type AppWebviewController, openAppWebview } from '../../_integration/openAppWebview';
import { type RouterContext } from './basicViewRouter';

export interface BasicViewConfig {
    title: string;
}

/**
 * Opens the Basic demo webview panel.
 *
 * A construction-only panel: it derives its configuration and router context,
 * then hands the fixed wiring to the `openAppWebview` preset. The returned
 * handle exposes `panel`, `onDisposed`, `revealToForeground`, `dispose`, and
 * `isDisposed`.
 */
export function openBasicViewPanel(): AppWebviewController<BasicViewConfig> {
    const config: BasicViewConfig = {
        title: 'Basic View',
    };

    const context: RouterContext = {
        webviewName: 'basicView',
    };

    return openAppWebview({
        title: 'Basic View',
        webviewName: 'basicView',
        config,
        context,
    });
}
