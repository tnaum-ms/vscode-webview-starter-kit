/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as l10n from '@vscode/l10n';
import { type BaseRouterContext } from '../../api/configuration/appRouter';
import { publicProcedureWithTelemetry, router } from '../../api/extension-server/trpc';

export type RouterContext = BaseRouterContext;

/**
 * Router for the basic demo view.
 */
export const basicViewRouter = router({
    /**
     * Returns a greeting message from the extension host.
     */
    hello: publicProcedureWithTelemetry.query(async () => {
        return {
            message: l10n.t('Hello from the extension!'),
        };
    }),
});
