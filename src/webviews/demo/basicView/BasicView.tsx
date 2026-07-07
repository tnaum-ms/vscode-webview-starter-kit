/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Body1, Button, Title1 } from '@fluentui/react-components';
import * as l10n from '@vscode/l10n';
import { useState } from 'react';
import './basicView.scss';

export const BasicView: React.FC = () => {
    const [message, setMessage] = useState<string>('');

    // For now the button just updates local React state. Step 4 replaces this
    // with a call to the extension host over tRPC.
    const handlePress = (): void => {
        setMessage(l10n.t('You pressed the button!'));
    };

    return (
        <div className="basicView">
            <Title1>{l10n.t('Basic View')}</Title1>

            <div className="basicView__actions">
                <Button appearance="primary" onClick={handlePress}>
                    {l10n.t('Press Me')}
                </Button>
                {message && <Body1>{message}</Body1>}
            </div>
        </div>
    );
};
