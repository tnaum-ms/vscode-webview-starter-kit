/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Title1 } from '@fluentui/react-components';
import * as l10n from '@vscode/l10n';
import './basicView.scss';

export const BasicView: React.FC = () => {
    return (
        <div className="basicView">
            <Title1>{l10n.t('Basic View')}</Title1>
        </div>
    );
};
