import * as vscode from 'vscode';
import { type AppWebviewController, openAppWebview } from '../../_integration/openAppWebview';

// The preset owns panel setup; navigation uses host commands while the samples own local state.
export function openComponentShowcasePanel(): AppWebviewController<Record<string, never>> {
    return openAppWebview({
        title: vscode.l10n.t('Component Showcase'),
        webviewName: 'componentShowcase',
        config: {},
        context: { webviewName: 'componentShowcase' },
    });
}

export function openShowcaseWizardPanel(): AppWebviewController<Record<string, never>> {
    return openAppWebview({
        title: vscode.l10n.t('Wizard demo'),
        webviewName: 'showcaseWizard',
        config: {},
        context: { webviewName: 'showcaseWizard' },
    });
}
