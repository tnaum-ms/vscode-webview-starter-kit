/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../../../extensionVariables';
import { WebviewController } from '../../api/extension-server/WebviewController';
import { type RouterContext } from './mainViewRouter';

export interface MainViewConfig {
    extensionVersion: string;
}

export class MainViewController extends WebviewController<MainViewConfig> {
    constructor() {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        const version = (ext.context.extension.packageJSON.version as string) ?? '0.0.0';

        const config: MainViewConfig = {
            extensionVersion: version,
        };

        super(ext.context, 'Webview Starter Kit', 'mainView', config);

        const trpcContext: RouterContext = {
            webviewName: 'mainView',
            extensionVersion: version,
        };

        this.setupTrpc(trpcContext);
    }
}
