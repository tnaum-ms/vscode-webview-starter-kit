/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

'use strict';

import * as l10n from '@vscode/l10n';
import * as vscode from 'vscode';
import { ext } from './extensionVariables';

export async function activateInternal(
    context: vscode.ExtensionContext,
    perfStats: { loadStartTime: number; loadEndTime: number },
): Promise<void> {
    ext.context = context;
    ext.isBundle = !!process.env.IS_BUNDLE;

    ext.outputChannel = vscode.window.createOutputChannel('Webview Starter Kit');
    context.subscriptions.push(ext.outputChannel);

    if (vscode.l10n.uri) {
        l10n.config({
            contents: vscode.l10n.bundle ?? {},
        });
    }

    const loadTimeMs = perfStats.loadEndTime - perfStats.loadStartTime;
    ext.outputChannel.appendLine(`Extension activated (load time: ${loadTimeMs}ms)`);

    // Register the command to open the main demo webview (useful if the user closes it)
    const { openMainView } = await import('./commands/openMainView');
    context.subscriptions.push(vscode.commands.registerCommand('webviewStarter.openMainView', openMainView));

    // Automatically open the main view on activation
    openMainView();
}

// This method is called when your extension is deactivated
export function deactivateInternal(_context: vscode.ExtensionContext): void {
    // NOOP
}
