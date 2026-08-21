/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { teamsLightTheme, type Theme } from '@fluentui/react-components';
// eslint-disable-next-line import/no-internal-modules
import { type MonacoTheme } from '../../components/monaco/monacoTheme';

export type ThemeState = {
    themeKind: string;
    useAdaptive: boolean;
    fluentUI: {
        theme?: Theme;
        themeKind: string;
    };
    monaco: MonacoTheme;
};

export const defaultState: ThemeState = {
    themeKind: 'vscode-light',
    useAdaptive: false,
    fluentUI: {
        theme: teamsLightTheme,
        themeKind: 'vscode-light',
    },
    monaco: {
        theme: undefined,
        themeName: 'vs',
    },
};
