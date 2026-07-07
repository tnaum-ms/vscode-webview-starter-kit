/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type BaseRouterContext } from '../../_integration/appRouter';
import { router } from '../../_integration/trpc';

export type RouterContext = BaseRouterContext;

/**
 * Router for the basic demo view.
 *
 * Empty for now — the view has no extension-host procedures yet. Step 4 of the
 * tutorial adds the first `hello` query.
 */
export const basicViewRouter = router({});
