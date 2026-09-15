import * as vscode from 'vscode';
import { openComponentShowcase } from '../../../commands/openComponentShowcase';
import { openShowcaseWizard } from '../../../commands/openShowcaseWizard';
import { openAppWebview } from '../../_integration/openAppWebview';
import { openComponentShowcasePanel, openShowcaseWizardPanel } from './componentShowcaseController';

// Test consumer-owned wiring without opening a panel or importing the package transport.
jest.mock('../../_integration/openAppWebview', () => ({
    openAppWebview: jest.fn(() => ({ dispose: jest.fn() })),
}));

describe('componentShowcaseController', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('opens the registered showcase with empty configuration and matching context', () => {
        openComponentShowcasePanel();

        expect(openAppWebview).toHaveBeenCalledTimes(1);
        expect(openAppWebview).toHaveBeenCalledWith({
            title: 'Component Showcase',
            webviewName: 'componentShowcase',
            config: {},
            context: { webviewName: 'componentShowcase' },
        });
    });

    it('returns the panel handle unchanged', () => {
        const controller = openComponentShowcasePanel();

        expect(controller).toBe(jest.mocked(openAppWebview).mock.results[0]?.value);
        expect(controller).toEqual({ dispose: expect.any(Function) });
    });

    it('uses the localized panel title', () => {
        const translate = jest.spyOn(vscode.l10n, 't').mockReturnValueOnce('Localized showcase');

        openComponentShowcasePanel();

        expect(translate).toHaveBeenCalledWith('Component Showcase');
        expect(openAppWebview).toHaveBeenCalledWith(expect.objectContaining({ title: 'Localized showcase' }));
    });

    it('opens one panel when the command is invoked', () => {
        openComponentShowcase();

        expect(openAppWebview).toHaveBeenCalledTimes(1);
        expect(openAppWebview).toHaveBeenCalledWith(expect.objectContaining({ webviewName: 'componentShowcase' }));
    });

    it('opens the wizard as a distinct full-page webview and returns its handle', () => {
        const controller = openShowcaseWizardPanel();

        expect(controller).toBe(jest.mocked(openAppWebview).mock.results[0]?.value);
        expect(openAppWebview).toHaveBeenCalledWith({
            title: 'Wizard demo',
            webviewName: 'showcaseWizard',
            config: {},
            context: { webviewName: 'showcaseWizard' },
        });
    });

    it('opens the wizard from its command using a localized title', () => {
        const translate = jest.spyOn(vscode.l10n, 't').mockReturnValueOnce('Localized setup');
        openShowcaseWizard();

        expect(translate).toHaveBeenCalledWith('Wizard demo');
        expect(openAppWebview).toHaveBeenCalledTimes(1);
        expect(openAppWebview).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Localized setup',
                webviewName: 'showcaseWizard',
            }),
        );
    });
});
