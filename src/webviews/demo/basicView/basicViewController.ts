/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../../../extensionVariables';
import { WebviewController } from '../../api/extension-server/WebviewController';
import { type RouterContext } from './basicViewRouter';

export interface BasicViewConfig {
    title: string;
}

export class BasicViewController extends WebviewController<BasicViewConfig> {
    constructor() {
        const config: BasicViewConfig = {
            title: 'Basic View',
        };

        super(ext.context, 'Basic View', 'basicView', config);

        const trpcContext: RouterContext = {
            webviewName: 'basicView',
        };

        this.setupTrpc(trpcContext);
    }
}
