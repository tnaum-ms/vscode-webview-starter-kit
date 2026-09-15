// eslint-disable-next-line import/no-internal-modules
import { useVSCodeMonacoTheme } from '@microsoft/vscode-ext-webview-fluentui/monaco';
import Editor, { useMonaco, type EditorProps } from '@monaco-editor/react';
// eslint-disable-next-line import/no-internal-modules
import * as monacoEditor from 'monaco-editor/esm/vs/editor/editor.api';
import type * as React from 'react';
import { Children, isValidElement, useLayoutEffect, useRef, type ReactElement, type ReactNode } from 'react';
import { MonacoEditor, type MonacoEditorProps } from '../MonacoEditor';

jest.mock('@microsoft/vscode-ext-webview-fluentui/monaco', () => ({
    useVSCodeMonacoTheme: jest.fn(),
}));
jest.mock('@monaco-editor/react', () => ({
    __esModule: true,
    default: jest.fn(),
    loader: { config: jest.fn() },
    useMonaco: jest.fn(),
}));
jest.mock('monaco-editor/esm/vs/editor/editor.api', () => ({
    editor: { defineTheme: jest.fn(), setTheme: jest.fn() },
}));
jest.mock('@fluentui/react-components', () => ({
    useUncontrolledFocus: jest.fn(() => ({})),
}));

// Keep these tests DOM-free: control hook scheduling and test only the wrapper's Monaco API wiring.
jest.mock('react', () => ({
    ...jest.requireActual<typeof React>('react'),
    useCallback: jest.fn((callback: unknown): unknown => callback),
    useEffect: jest.fn(),
    useLayoutEffect: jest.fn(),
    useRef: jest.fn(),
    useState: jest.fn(() => [false, jest.fn()]),
}));

describe('MonacoEditor theme integration', () => {
    const initialTheme: ReturnType<typeof useVSCodeMonacoTheme> = {
        themeName: 'adaptive',
        data: { base: 'vs-dark', inherit: true, rules: [], colors: { 'editor.background': '#111111' } },
    };
    const updatedTheme: ReturnType<typeof useVSCodeMonacoTheme> = {
        ...initialTheme,
        data: { ...initialTheme.data, colors: { 'editor.background': '#222222' } },
    };
    const themeRef = { current: { monacoTheme: initialTheme, beforeMount: undefined as EditorProps['beforeMount'] } };

    function renderEditor(props: MonacoEditorProps = {}): EditorProps {
        jest.mocked(useRef)
            .mockReturnValueOnce(themeRef)
            .mockReturnValueOnce({ current: false })
            .mockReturnValueOnce({ current: [] });
        const wrapper: ReactElement<{ children: ReactNode }> = MonacoEditor(props);
        const editor = Children.toArray(wrapper.props.children).find(
            (child): child is ReactElement<EditorProps> => isValidElement<EditorProps>(child) && child.type === Editor,
        );
        if (!editor) {
            throw new Error('Expected the Monaco Editor child');
        }
        jest.mocked(useLayoutEffect).mock.calls.forEach(([effect]) => effect());
        jest.mocked(useLayoutEffect).mockClear();
        return editor.props;
    }

    beforeEach(() => {
        jest.clearAllMocks();
        themeRef.current = { monacoTheme: initialTheme, beforeMount: undefined };
        jest.mocked(useMonaco).mockReturnValue(null);
        jest.mocked(useVSCodeMonacoTheme).mockReturnValue(initialTheme);
    });

    it('registers the theme before creation and before the consumer callback', () => {
        const beforeMount = jest.fn(() => {
            expect(monacoEditor.editor.defineTheme).toHaveBeenCalledWith(initialTheme.themeName, initialTheme.data);
        });
        const editor = renderEditor({ beforeMount });

        expect(monacoEditor.editor.defineTheme).not.toHaveBeenCalled();
        editor.beforeMount?.(monacoEditor);

        expect(beforeMount).toHaveBeenCalledWith(monacoEditor);
        expect(editor.theme).toBe(initialTheme.themeName);
    });

    it('redefines and applies changed colors without a theme-kind change', () => {
        jest.mocked(useMonaco).mockReturnValue(monacoEditor);
        renderEditor();
        jest.mocked(monacoEditor.editor.defineTheme).mockClear();
        jest.mocked(monacoEditor.editor.setTheme).mockClear();

        jest.mocked(useVSCodeMonacoTheme).mockReturnValue(updatedTheme);
        renderEditor();

        expect(monacoEditor.editor.defineTheme).toHaveBeenCalledWith(updatedTheme.themeName, updatedTheme.data);
        expect(monacoEditor.editor.setTheme).toHaveBeenCalledWith(updatedTheme.themeName);
    });

    it('uses the latest theme and callback when asynchronous loading finishes', () => {
        const initialBeforeMount = jest.fn();
        const pendingBeforeMount = renderEditor({ beforeMount: initialBeforeMount }).beforeMount;
        const latestBeforeMount = jest.fn();

        jest.mocked(useVSCodeMonacoTheme).mockReturnValue(updatedTheme);
        renderEditor({ beforeMount: latestBeforeMount });
        pendingBeforeMount?.(monacoEditor);

        expect(monacoEditor.editor.defineTheme).toHaveBeenCalledWith(updatedTheme.themeName, updatedTheme.data);
        expect(initialBeforeMount).not.toHaveBeenCalled();
        expect(latestBeforeMount).toHaveBeenCalledWith(monacoEditor);
    });
});
