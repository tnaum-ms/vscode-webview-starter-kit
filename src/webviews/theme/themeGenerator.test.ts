import { afterEach, beforeEach, describe, expect, test } from '@jest/globals';

import { generateAdaptiveDarkTheme, generateAdaptiveLightTheme } from './themeGenerator';

describe('adaptive theme variables', () => {
    let originalDocument: Document | undefined;
    let originalGetComputedStyle: typeof getComputedStyle;

    beforeEach(() => {
        originalDocument = globalThis.document;
        originalGetComputedStyle = globalThis.getComputedStyle;
        globalThis.document = { documentElement: {} } as unknown as Document;
        globalThis.getComputedStyle = (() =>
            ({
                getPropertyValue: () => '#0078d4',
            }) as unknown as CSSStyleDeclaration) as typeof getComputedStyle;
    });

    afterEach(() => {
        if (originalDocument) {
            globalThis.document = originalDocument;
        } else {
            delete (globalThis as { document?: Document }).document;
        }
        globalThis.getComputedStyle = originalGetComputedStyle;
    });

    test.each([
        ['light', generateAdaptiveLightTheme],
        ['dark', generateAdaptiveDarkTheme],
    ])('%s theme uses VS Code variables for neutral interaction states', (_, generateTheme) => {
        const theme = generateTheme();

        expect(theme.colorNeutralBackground1Pressed).toBe(
            'var(--vscode-toolbar-activeBackground, var(--vscode-list-hoverBackground, var(--vscode-editorWidget-background)))',
        );
        expect(theme.colorNeutralBackground2Pressed).toBe(
            'var(--vscode-toolbar-activeBackground, var(--vscode-list-hoverBackground, var(--vscode-sideBar-background)))',
        );
        expect(theme.colorNeutralForeground1Selected).toBe(
            'var(--vscode-list-inactiveSelectionForeground, var(--vscode-editor-foreground))',
        );
        expect(theme.colorNeutralForeground2Selected).toBe(
            'var(--vscode-list-inactiveSelectionForeground, var(--vscode-editor-foreground))',
        );
    });

    test('uses theme-direction overlays for skeleton stencils', () => {
        const lightTheme = generateAdaptiveLightTheme();
        const darkTheme = generateAdaptiveDarkTheme();

        expect(lightTheme.colorNeutralStencil1).toBe('rgba(0, 0, 0, 0.07)');
        expect(lightTheme.colorNeutralStencil2).toBe('rgba(0, 0, 0, 0.1)');
        expect(darkTheme.colorNeutralStencil1).toBe('rgba(255, 255, 255, 0.07)');
        expect(darkTheme.colorNeutralStencil2).toBe('rgba(255, 255, 255, 0.1)');
    });
});
