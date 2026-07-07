/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MainView } from '../demo/mainView/MainView';

/**
 * Maps each webview name to the React component mounted for it.
 *
 * The whole webview side ships as a single bundle (`views.js`). When a panel
 * opens, the framework's generated HTML calls `render(viewType, acquireVsCodeApi())`
 * (see `src/webviews/index.tsx`), passing the `viewType` the panel was created
 * with. This registry turns that string key into the correct root component to
 * render; without it a single bundle could not serve more than one panel type.
 *
 * It is also the single source of the {@link WebviewName} union, which the host
 * side (`openAppWebview` / `OpenAppWebviewOptions.webviewName`) uses so a panel
 * can only be opened with a name that has a registered component. A typo becomes
 * a compile error instead of a blank panel at runtime.
 */
export const WebviewRegistry = {
    mainView: MainView,
} as const;

/**
 * Union type of all registered webview name keys (e.g. `'basicView'`).
 *
 * Used host-side by `openAppWebview` / `OpenAppWebviewOptions.webviewName` to
 * constrain which panels can be opened, and webview-side by `render(...)` in
 * `src/webviews/index.tsx` to type the lookup key.
 */
export type WebviewName = keyof typeof WebviewRegistry;
