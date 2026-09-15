import { Body1, Button, MessageBar, MessageBarBody, Subtitle1 } from '@fluentui/react-components';
import { OpenRegular } from '@fluentui/react-icons';
import * as l10n from '@vscode/l10n';
import { useState, type JSX } from 'react';
import { useTrpcClient } from '../../../../../_integration/useTrpcClient';

export function ComponentShowcaseTab(): JSX.Element {
    const trpcClient = useTrpcClient();
    const [opening, setOpening] = useState(false);
    const [error, setError] = useState('');

    async function openShowcase(): Promise<void> {
        setOpening(true);
        setError('');
        try {
            await trpcClient.demo.mainView.openComponentShowcase.mutate();
        } catch (cause) {
            setError(
                l10n.t('Could not open the showcase: {0}', cause instanceof Error ? cause.message : String(cause)),
            );
        } finally {
            setOpening(false);
        }
    }

    return (
        <section className="mainView__tab-panel" aria-labelledby="component-showcase-title">
            <Subtitle1 as="h2" id="component-showcase-title">
                {l10n.t('Component Showcase')}
            </Subtitle1>
            <Body1>
                {l10n.t(
                    'Explore the components shipped in @microsoft/vscode-ext-webview-fluentui: layouts, step navigation, status lists, metrics, and keyboard-focusable badges.',
                )}
            </Body1>
            <div className="mainView__button-row">
                <Button
                    appearance="primary"
                    icon={<OpenRegular />}
                    disabled={opening}
                    onClick={() => void openShowcase()}
                >
                    {l10n.t('Open Component Showcase')}
                </Button>
            </div>
            {error && (
                <MessageBar intent="error">
                    <MessageBarBody>{error}</MessageBarBody>
                </MessageBar>
            )}
        </section>
    );
}
