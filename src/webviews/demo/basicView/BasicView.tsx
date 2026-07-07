/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Body1, Button, Title1 } from '@fluentui/react-components';
import * as l10n from '@vscode/l10n';
import { useState } from 'react';
import { useTrpcClient } from '../../_integration/useTrpcClient';
import './basicView.scss';

export const BasicView: React.FC = () => {
    const [message, setMessage] = useState<string>('');
    const trpcClient = useTrpcClient();

    const handlePress = async (): Promise<void> => {
        const result = await trpcClient.demo.basicView.hello.query();
        setMessage(result.message);
    };

    return (
        <div className="basicView">
            <Title1>{l10n.t('Basic View')}</Title1>

            <div className="basicView__actions">
                <Button appearance="primary" onClick={() => void handlePress()}>
                    {l10n.t('Press Me')}
                </Button>
                {message && <Body1>{message}</Body1>}
            </div>
        </div>
    );
};
