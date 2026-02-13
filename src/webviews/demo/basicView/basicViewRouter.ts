/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type BaseRouterContext } from '../../api/configuration/appRouter';
import { router } from '../../api/extension-server/trpc';

export type RouterContext = BaseRouterContext;

/**
 * Router for the basic demo view.
 *
 * Starts empty — procedures will be added in later commits.
 */
export const basicViewRouter = router({});
