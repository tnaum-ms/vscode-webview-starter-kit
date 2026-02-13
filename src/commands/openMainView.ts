/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MainViewController } from '../webviews/demo/mainView/mainViewController';

export function openMainView(): void {
    new MainViewController();
}
