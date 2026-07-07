/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../../../extensionVariables';
import { type AppWebviewController, openAppWebview } from '../../_integration/openAppWebview';
import { type RouterContext } from './mainViewRouter';

export interface MainViewConfig {
    extensionVersion: string;
}

/**
 * Opens the Main demo webview panel.
 *
 * A construction-only panel: it derives its configuration and router context,
 * then hands the fixed wiring to the `openAppWebview` preset. The returned
 * handle exposes `panel`, `onDisposed`, `revealToForeground`, `dispose`, and
 * `isDisposed`.
 */
export function openMainViewPanel(): AppWebviewController<MainViewConfig> {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    const version = (ext.context.extension.packageJSON.version as string) ?? '0.0.0';

    const config: MainViewConfig = {
        extensionVersion: version,
    };

    const context: RouterContext = {
        webviewName: 'mainView',
        extensionVersion: version,
    };

    return openAppWebview({
        title: 'Webview Starter Kit',
        webviewName: 'mainView',
        config,
        context,
    });
}
