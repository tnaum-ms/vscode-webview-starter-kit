/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { type BrandVariants, createDarkTheme, createLightTheme, type Theme } from '@fluentui/react-components';
import { hex_to_LCH, hexColorsFromPalette, type Palette, RGBAToHexA } from './utils';

type Options = {
    darkCp?: number;
    lightCp?: number;
    hueTorsion?: number;
};

/**
 * A palette is represented as a continuous curve through LAB space, made of two quadratic bezier curves that start at
 * 0L (black) and 100L (white) and meet at the LAB value of the provided key color.
 *
 * This function takes in a palette as input, which consists of:
 * keyColor:        The primary color in the LCH (Lightness Chroma Hue) color space
 * darkCp, lightCp: The control point of the quadratic beizer curve towards black and white, respectively (between 0-1).
 *                  Higher values move the control point toward the ends of the gamut causing chroma/saturation to
 *                  diminish more slowly near the key color, and lower values move the control point toward the key
 *                  color causing chroma/saturation to diminish more linearly.
 * hueTorsion:      Enables the palette to move through different hues by rotating the curve’s points in LAB space,
 *                  creating a helical curve

 * The function returns a set of brand tokens.
 */
export function getBrandTokensFromPalette(keyColor: string, options: Options = {}) {
    const { darkCp = 2 / 3, lightCp = 1 / 3, hueTorsion = 0 } = options;

    if (!keyColor.startsWith('#')) {
        if (keyColor.startsWith('rgb')) {
            keyColor = RGBAToHexA(keyColor);
        }

        // TODO: If the color is not a hex value
    }

    const brandPalette: Palette = {
        keyColor: hex_to_LCH(keyColor),
        darkCp,
        lightCp,
        hueTorsion,
    };
    const hexColors = hexColorsFromPalette(keyColor, brandPalette, 16, 1);
    return hexColors.reduce((acc: Record<string, string>, hexColor, h) => {
        acc[`${(h + 1) * 10}`] = hexColor;
        return acc;
    }, {}) as BrandVariants;
}

// Keep these mappings local for now. vscode-documentdb is working to extract
// the shared theme-related functions into a dedicated package.
const adaptiveNeutralSurfaces = {
    colorNeutralBackground1Hover:
        'var(--vscode-list-hoverBackground, var(--vscode-editorWidget-background, var(--vscode-editor-background)))',
    colorNeutralBackground1Pressed:
        'var(--vscode-toolbar-activeBackground, var(--vscode-list-hoverBackground, var(--vscode-editorWidget-background)))',
    colorNeutralBackground1Selected:
        'var(--vscode-list-inactiveSelectionBackground, var(--vscode-list-hoverBackground, var(--vscode-editorWidget-background)))',
    colorNeutralBackgroundDisabled:
        'var(--vscode-input-background, var(--vscode-editorWidget-background, var(--vscode-editor-background)))',
    colorNeutralForegroundDisabled:
        'var(--vscode-disabledForeground, var(--vscode-descriptionForeground, var(--vscode-foreground)))',
    colorNeutralStrokeDisabled:
        'var(--vscode-disabledForeground, var(--vscode-widget-border, var(--vscode-panel-border)))',
    colorSubtleBackgroundHover:
        'var(--vscode-toolbar-hoverBackground, var(--vscode-list-hoverBackground, var(--vscode-editorWidget-background)))',
    colorSubtleBackgroundPressed:
        'var(--vscode-toolbar-activeBackground, var(--vscode-list-activeSelectionBackground, var(--vscode-list-hoverBackground)))',
    colorNeutralBackground2:
        'var(--vscode-tree-tableOddRowsBackground, var(--vscode-sideBar-background, var(--vscode-editorWidget-background)))',
    colorNeutralBackground2Hover:
        'var(--vscode-list-hoverBackground, var(--vscode-sideBar-background, var(--vscode-editorWidget-background)))',
    colorNeutralBackground2Pressed:
        'var(--vscode-toolbar-activeBackground, var(--vscode-list-hoverBackground, var(--vscode-sideBar-background)))',
    colorNeutralBackground2Selected:
        'var(--vscode-list-inactiveSelectionBackground, var(--vscode-list-hoverBackground, var(--vscode-sideBar-background)))',
    colorNeutralStroke2: 'var(--vscode-panel-border, var(--vscode-widget-border, var(--vscode-editorWidget-border)))',
} satisfies Partial<Theme>;

const lightSkeletonStencils = {
    colorNeutralStencil1: 'rgba(0, 0, 0, 0.07)',
    colorNeutralStencil2: 'rgba(0, 0, 0, 0.1)',
} satisfies Partial<Theme>;

const darkSkeletonStencils = {
    colorNeutralStencil1: 'rgba(255, 255, 255, 0.07)',
    colorNeutralStencil2: 'rgba(255, 255, 255, 0.1)',
} satisfies Partial<Theme>;

// https://react.fluentui.dev/?path=/docs/concepts-developer-theming--page#overriding-existing-tokens
export const generateAdaptiveLightTheme = (): Theme => {
    const style = getComputedStyle(document.documentElement);
    const buttonBackground = style.getPropertyValue('--vscode-button-background');
    const brandVSCode: BrandVariants = getBrandTokensFromPalette(buttonBackground);

    return {
        ...createLightTheme(brandVSCode),
        ...{
            colorNeutralForeground1: 'var(--vscode-editor-foreground)',
            colorNeutralForeground1Hover: 'var(--vscode-editor-foreground)',
            colorNeutralForeground1Pressed: 'var(--vscode-editor-foreground)',
            colorNeutralForeground1Selected:
                'var(--vscode-list-inactiveSelectionForeground, var(--vscode-editor-foreground))',
            colorNeutralForeground2Selected:
                'var(--vscode-list-inactiveSelectionForeground, var(--vscode-editor-foreground))',

            colorNeutralBackground1: 'var(--vscode-editor-background)',

            ...adaptiveNeutralSurfaces,
            ...lightSkeletonStencils,
        },
    };
};

export const generateAdaptiveDarkTheme = (): Theme => {
    const style = getComputedStyle(document.documentElement);
    const buttonBackground = style.getPropertyValue('--vscode-button-background');
    const brandVSCode: BrandVariants = getBrandTokensFromPalette(buttonBackground);

    return {
        ...createDarkTheme(brandVSCode),
        ...{
            // Use editor-foreground for text on editor-background (fixes Nord theme and similar)
            colorNeutralForeground1: 'var(--vscode-editor-foreground)',
            colorNeutralForeground1Hover: 'var(--vscode-editor-foreground)',
            colorNeutralForeground1Pressed: 'var(--vscode-editor-foreground)',
            colorNeutralForeground1Selected:
                'var(--vscode-list-inactiveSelectionForeground, var(--vscode-editor-foreground))',
            colorNeutralForeground2: 'var(--vscode-foreground)',
            colorNeutralForeground2Hover: 'var(--vscode-foreground)',
            colorNeutralForeground2Pressed: 'var(--vscode-foreground)',
            colorNeutralForeground2Selected:
                'var(--vscode-list-inactiveSelectionForeground, var(--vscode-editor-foreground))',

            colorNeutralBackground1: 'var(--vscode-editor-background)',

            ...adaptiveNeutralSurfaces,
            ...darkSkeletonStencils,
        },
    };
};
