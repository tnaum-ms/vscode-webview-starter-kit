/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// eslint-disable-next-line import/no-internal-modules
import type * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import { vscodeThemeTokens, vscodeThemeTokenToCSSVar } from './vscodeThemeTokens';

export type MonacoBuiltinTheme = monacoEditor.editor.BuiltinTheme;
export type MonacoThemeData = monacoEditor.editor.IStandaloneThemeData;
export type MonacoColors = monacoEditor.editor.IColors;

export type MonacoTheme = {
    theme?: MonacoThemeData;
    themeName: string;
};

function rgbaToHexA(rgba: string, forceRemoveAlpha = false): string {
    return (
        '#' +
        rgba
            .replace(/^rgba?\(|\s+|\)$/g, '') // Gets rgba / rgb string values
            .split(',') // splits them at ","
            .filter((_string, index) => !forceRemoveAlpha || index !== 3)
            .map((string) => parseFloat(string)) // Converts them to numbers
            .map((number, index) => (index === 3 ? Math.round(number * 255) : number)) // Converts alpha to 255 number
            .map((number) => number.toString(16)) // Converts numbers to hex
            .map((string) => (string.length === 1 ? '0' + string : string)) // Adds 0 when length of one number is 1
            .join('')
    ); // Puts the array together to a string
}

function monacoBaseThemeFor(themeKind: string): MonacoBuiltinTheme {
    switch (themeKind) {
        case 'vscode-dark':
            return 'vs-dark';
        case 'vscode-high-contrast':
            return 'hc-black';
        case 'vscode-high-contrast-light':
            return 'hc-light';
        default:
            return 'vs';
    }
}

/**
 * Reads every VS Code workbench color off the document and hands it to Monaco.
 *
 * Monaco is not Fluent, so this derivation stays in the extension rather than moving into
 * `@microsoft/vscode-ext-webview-fluentui` — the package refuses a ~5 MB `monaco-editor` peer.
 */
export function generateMonacoTheme(baseTheme: MonacoBuiltinTheme): MonacoThemeData {
    const style = getComputedStyle(document.documentElement);
    const colors = vscodeThemeTokens
        .map((token) => {
            let color = style.getPropertyValue(vscodeThemeTokenToCSSVar(token));
            if (!color.startsWith('#') && color.startsWith('rgb')) {
                color = rgbaToHexA(color);
            }
            return [token, color];
        })
        .filter(([, color]) => color !== '');

    return {
        base: baseTheme,
        inherit: true,
        rules: [],
        colors: Object.fromEntries(colors) as MonacoColors,
    };
}

let cache: { themeKind: string; monacoTheme: MonacoTheme } | undefined;

/**
 * The Monaco theme for a VS Code theme kind.
 *
 * Cached on the theme kind because the derivation performs ~800 `getPropertyValue` lookups and
 * every mounted editor calls this independently — there is no shared theme context to amortise it.
 */
export function getMonacoTheme(themeKind: string): MonacoTheme {
    if (cache?.themeKind === themeKind) {
        return cache.monacoTheme;
    }

    const monacoTheme: MonacoTheme = {
        themeName: 'adaptive',
        theme: generateMonacoTheme(monacoBaseThemeFor(themeKind)),
    };

    cache = { themeKind, monacoTheme };
    return monacoTheme;
}
