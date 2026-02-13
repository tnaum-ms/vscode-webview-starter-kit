/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Badge, Body1, Subtitle1, useFocusFinders } from '@fluentui/react-components';
import * as l10n from '@vscode/l10n';
import { useCallback, useRef, useState } from 'react';
import { MonacoEditor } from '../../../../../components/MonacoEditor';

/** Sample JSON shown in the Monaco Editor demo tab. */
const SAMPLE_JSON = JSON.stringify(
    {
        greeting: 'Hello from Monaco!',
        tips: [
            'This editor auto-adapts to VS Code themes.',
            'Press Escape to exit the editor focus trap.',
            'Try Ctrl+Space for IntelliSense.',
        ],
    },
    null,
    2,
);

export const MonacoTab: React.FC = () => {
    const [monacoContent, setMonacoContent] = useState<string>(SAMPLE_JSON);
    const monacoEditorRef = useRef<HTMLDivElement | null>(null);
    const { findNextFocusable } = useFocusFinders();

    /**
     * Escape key handler for the Monaco Editor.
     * Moves focus to the next focusable element outside the editor,
     * allowing keyboard users to exit the editor's focus trap.
     */
    const handleEscapeEditor = useCallback(() => {
        const container = monacoEditorRef.current;
        if (!container) {
            return;
        }
        const activeElement = document.activeElement as HTMLElement | null;
        const startElement = activeElement ?? container;
        const nextElement = findNextFocusable(startElement);
        if (nextElement) {
            nextElement.focus();
        } else {
            activeElement?.blur();
        }
    }, [findNextFocusable]);

    return (
        <div className="mainView__tab-panel">
            <div className="mainView__card">
                <div className="mainView__card-header">
                    <Subtitle1>{l10n.t('Monaco Editor')}</Subtitle1>
                    <Badge appearance="tint" color="brand">
                        {l10n.t('Editor')}
                    </Badge>
                </div>
                <Body1>
                    {l10n.t(
                        'The same editor engine that powers VS Code, embedded in a webview. The theme automatically syncs with VS Code. Press Escape to exit the editor focus trap.',
                    )}
                </Body1>
                <div className="mainView__card-content">
                    <div className="mainView__monaco-container" ref={monacoEditorRef}>
                        <MonacoEditor
                            language="json"
                            value={monacoContent}
                            onChange={(value: string | undefined) => {
                                setMonacoContent(value ?? '');
                            }}
                            onEscapeEditor={handleEscapeEditor}
                            options={{
                                minimap: { enabled: false },
                                fontSize: 13,
                                lineNumbers: 'on',
                                scrollBeyondLastLine: false,
                                wordWrap: 'on',
                                automaticLayout: true,
                                ariaLabel: l10n.t('JSON Editor: Edit sample JSON content. Press Escape to exit.'),
                            }}
                        />
                    </div>
                    <Body1>{l10n.t('Content length: {length} characters', { length: monacoContent.length })}</Body1>
                </div>
            </div>
        </div>
    );
};
