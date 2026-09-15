import {
    Button,
    CounterBadge,
    Field,
    Input,
    Link,
    MessageBar,
    MessageBarBody,
    MessageBarTitle,
    Switch,
    Table,
    TableBody,
    TableCell,
    TableCellLayout,
    TableRow,
    Text,
    Tooltip,
} from '@fluentui/react-components';
import { ArrowResetRegular, BoxMultipleRegular, EditRegular } from '@fluentui/react-icons';
import {
    ContainerFooter,
    ContainerHeader,
    StatusList,
    StatusListItem,
    Wizard,
    WizardStep,
    type StatusListItemStatus,
} from '@microsoft/vscode-ext-webview-fluentui/components';
import * as l10n from '@vscode/l10n';
import { Fragment, useEffect, useRef, useState, type JSX, type ReactNode } from 'react';
import { useTrpcClient } from '../../_integration/useTrpcClient';
import './showcaseWizard.scss';

type SetupPhase = 'introduction' | 'configure' | 'provisioning' | 'success';
type SetupStep = 'introduction' | 'configure' | 'setup' | 'done';

const stageIds = ['docker', 'image', 'container', 'startup', 'connection'] as const;
const stageDurationMs = 900;
const defaultContainerName = 'documentdb-local-demo';
const defaultHostPort = '10260';
const defaultImageTag = 'latest';
const imageRepository = 'ghcr.io/microsoft/documentdb/documentdb-local';
const componentDocs =
    'https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components';

interface RevealProps {
    readonly id: string;
    readonly open: boolean;
    readonly children: ReactNode;
}

function Reveal({ id, open, children }: RevealProps): JSX.Element {
    // Keep the grid mounted for exit motion; inert removes collapsed controls from keyboard navigation.
    return (
        <div id={id} className="showcaseWizard__reveal" data-open={open} aria-hidden={!open} inert={!open}>
            <div>{children}</div>
        </div>
    );
}

function stepForPhase(phase: SetupPhase): SetupStep {
    switch (phase) {
        case 'introduction':
            return 'introduction';
        case 'configure':
            return 'configure';
        case 'provisioning':
            return 'setup';
        case 'success':
            return 'done';
    }
}

export function ShowcaseWizard(): JSX.Element {
    const trpcClient = useTrpcClient();
    const [phase, setPhase] = useState<SetupPhase>('introduction');
    const [configurationVisited, setConfigurationVisited] = useState(false);
    const [hostPort, setHostPort] = useState(defaultHostPort);
    const [editingPort, setEditingPort] = useState(false);
    const [imageTag, setImageTag] = useState(defaultImageTag);
    const [editingImage, setEditingImage] = useState(false);
    const [customCredentials, setCustomCredentials] = useState(false);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [includeSampleData, setIncludeSampleData] = useState(true);
    const [completedStages, setCompletedStages] = useState(0);
    const portInputRef = useRef<HTMLInputElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const primaryButtonRef = useRef<HTMLButtonElement>(null);
    const secondaryButtonRef = useRef<HTMLButtonElement>(null);
    const step = stepForPhase(phase);
    const running = phase === 'provisioning';
    const completed = phase === 'success';
    const stepsLocked = running || completed;
    const normalizedPort = hostPort.trim();
    const portValid = /^\d+$/.test(normalizedPort) && Number(normalizedPort) >= 1024 && Number(normalizedPort) <= 65535;
    const credentialsValid = !customCredentials || (username.trim().length > 0 && password.length > 0);
    const imageTagValid = /^[\w][\w.-]*$/.test(imageTag.trim());
    const configurationValid = portValid && imageTagValid && credentialsValid;
    const endpoint = `mongodb://localhost:${Number(normalizedPort)}`;
    const image = `${imageRepository}:${imageTag.trim() || defaultImageTag}`;

    // Resolve translations during render, after the webview has configured its l10n bundle.
    const stageLabels = [
        l10n.t('Docker readiness'),
        l10n.t('Database image'),
        l10n.t('Container creation'),
        l10n.t('Database startup'),
        l10n.t('Connection readiness'),
    ];
    const stageDetails = [
        l10n.t('Development runtime ready.'),
        l10n.t('Official database image.'),
        l10n.t('Container: {0}', defaultContainerName),
        includeSampleData ? l10n.t('Inventory with 24 sample products.') : l10n.t('Empty inventory database.'),
        l10n.t('Address: localhost:{0}', Number(normalizedPort)),
    ];
    const statusLabels: Record<StatusListItemStatus, string> = {
        pending: l10n.t('Pending'),
        active: l10n.t('In progress'),
        done: l10n.t('Completed'),
        error: l10n.t('Failed'),
        warning: l10n.t('Warning'),
    };

    useEffect(() => {
        if (!running || completedStages >= stageIds.length) {
            return;
        }

        // Exactly one pending timer: changing step (cancel/reset) or unmounting clears it.
        // This is the whole simulation; there are no host calls, downloads, or Docker commands.
        const timer = setTimeout(() => {
            setCompletedStages((current) => current + 1);
        }, stageDurationMs);
        return () => clearTimeout(timer);
    }, [running, completedStages]);

    useEffect(() => {
        if (running && completedStages === stageIds.length) {
            setPhase('success');
        }
    }, [running, completedStages]);

    useEffect(() => {
        if (editingPort) portInputRef.current?.focus({ preventScroll: true });
    }, [editingPort]);
    useEffect(() => {
        if (editingImage) imageInputRef.current?.focus({ preventScroll: true });
    }, [editingImage]);
    useEffect(() => {
        if (completed && document.activeElement === secondaryButtonRef.current) {
            primaryButtonRef.current?.focus({ preventScroll: true });
        }
    }, [completed]);

    function advance(): void {
        if (phase === 'introduction') {
            setConfigurationVisited(true);
            setPhase('configure');
        } else if (phase === 'configure' && configurationValid) {
            setCompletedStages(0);
            setPhase('provisioning');
        }
    }

    function cancel(): void {
        setPhase('configure');
        setCompletedStages(0);
    }

    function reset(): void {
        setPhase('introduction');
        setConfigurationVisited(false);
        setCompletedStages(0);
        setHostPort(defaultHostPort);
        setEditingPort(false);
        setImageTag(defaultImageTag);
        setEditingImage(false);
        setCustomCredentials(false);
        setUsername('');
        setPassword('');
        setIncludeSampleData(true);
    }

    function showLearnMore(): void {
        void trpcClient.common.displayInformationMessage
            .mutate({
                message: l10n.t('About the wizard demo'),
                modal: true,
                detail: l10n.t(
                    'This demo mirrors the DocumentDB Local setup experience. It only simulates progress and does not create containers, download images, or save connections.',
                ),
            })
            .catch(() => undefined);
    }

    function getStageStatus(index: number): StatusListItemStatus {
        if (index < completedStages) {
            return 'done';
        }
        return running && index === completedStages ? 'active' : 'pending';
    }

    const settings: readonly {
        readonly id: string;
        readonly label: string;
        readonly value: ReactNode;
        readonly action: ReactNode;
        readonly open?: boolean;
        readonly editor?: ReactNode;
    }[] = [
        {
            id: 'address',
            label: l10n.t('Address'),
            value: portValid ? `localhost:${Number(normalizedPort)}` : l10n.t('Valid port required'),
            open: editingPort,
            action: (
                <Tooltip
                    content={editingPort ? l10n.t('Hide the port setting') : l10n.t('Change the port')}
                    relationship="label"
                    withArrow
                >
                    <Button
                        type="button"
                        appearance="subtle"
                        size="small"
                        icon={<EditRegular />}
                        aria-expanded={editingPort}
                        aria-controls="wizard-address-editor"
                        onClick={() => setEditingPort((current) => !current)}
                        data-testid="wizard-edit-port"
                    />
                </Tooltip>
            ),
            editor: (
                <Field
                    label={l10n.t('Port')}
                    required
                    hint={l10n.t('The host is always localhost. Use a whole number from 1024 to 65535.')}
                    validationState={portValid ? 'none' : 'error'}
                    validationMessage={
                        portValid ? undefined : l10n.t('Enter a whole-number port between 1024 and 65535.')
                    }
                >
                    <Input
                        ref={portInputRef}
                        value={hostPort}
                        inputMode="numeric"
                        onChange={(_event, data) => setHostPort(data.value)}
                        data-testid="wizard-port"
                        contentAfter={
                            <Tooltip content={l10n.t('Reset host port')} relationship="label">
                                <Button
                                    type="button"
                                    appearance="subtle"
                                    size="small"
                                    icon={<ArrowResetRegular />}
                                    onClick={() => {
                                        setHostPort(defaultHostPort);
                                        portInputRef.current?.focus({ preventScroll: true });
                                    }}
                                />
                            </Tooltip>
                        }
                    />
                </Field>
            ),
        },
        {
            id: 'image',
            label: l10n.t('Image'),
            value: <code className="showcaseWizard__imagePath">{image}</code>,
            open: editingImage,
            action: (
                <Tooltip
                    content={editingImage ? l10n.t('Hide the image tag setting') : l10n.t('Change the image tag')}
                    relationship="label"
                    withArrow
                >
                    <Button
                        type="button"
                        appearance="subtle"
                        size="small"
                        icon={<EditRegular />}
                        aria-expanded={editingImage}
                        aria-controls="wizard-image-editor"
                        onClick={() => setEditingImage((current) => !current)}
                        data-testid="wizard-edit-image"
                    />
                </Tooltip>
            ),
            editor: (
                <Field
                    label={l10n.t('Image tag')}
                    hint={l10n.t('The official image repository is fixed.')}
                    validationState={imageTagValid ? 'none' : 'error'}
                    validationMessage={imageTagValid ? undefined : l10n.t('Enter a valid container image tag.')}
                >
                    <Input
                        ref={imageInputRef}
                        value={imageTag}
                        maxLength={128}
                        onChange={(_event, data) => setImageTag(data.value)}
                        data-testid="wizard-image-tag"
                        contentAfter={
                            <Tooltip content={l10n.t('Reset image tag')} relationship="label">
                                <Button
                                    type="button"
                                    appearance="subtle"
                                    size="small"
                                    icon={<ArrowResetRegular />}
                                    onClick={() => {
                                        setImageTag(defaultImageTag);
                                        imageInputRef.current?.focus({ preventScroll: true });
                                    }}
                                />
                            </Tooltip>
                        }
                    />
                </Field>
            ),
        },
        {
            id: 'credentials',
            label: l10n.t('Credentials'),
            value: customCredentials ? l10n.t('Your own username and password') : l10n.t('Generated automatically'),
            open: customCredentials,
            action: (
                <Switch
                    checked={!customCredentials}
                    aria-label={l10n.t('Generate credentials automatically')}
                    onChange={(_event, data) => setCustomCredentials(!data.checked)}
                    data-testid="wizard-auto-credentials"
                />
            ),
            editor: (
                <div className="showcaseWizard__credentialFields">
                    <Field
                        label={l10n.t('Username')}
                        required
                        validationState={username.trim().length > 0 ? 'none' : 'error'}
                    >
                        <Input
                            value={username}
                            onChange={(_event, data) => setUsername(data.value)}
                            data-testid="wizard-username"
                        />
                    </Field>
                    <Field label={l10n.t('Password')} required validationState={password.length > 0 ? 'none' : 'error'}>
                        <Input
                            type="password"
                            value={password}
                            onChange={(_event, data) => setPassword(data.value)}
                            data-testid="wizard-password"
                        />
                    </Field>
                </div>
            ),
        },
        {
            id: 'sample-data',
            label: l10n.t('Sample data'),
            value: includeSampleData ? l10n.t('Included') : l10n.t('Not included'),
            action: (
                <Switch
                    checked={includeSampleData}
                    aria-label={l10n.t('Include sample data')}
                    onChange={(_event, data) => setIncludeSampleData(data.checked)}
                    data-testid="wizard-sample-data"
                />
            ),
        },
    ];

    const primaryLabels = [
        { visible: phase === 'introduction', label: l10n.t('Continue') },
        { visible: phase === 'configure', label: l10n.t('Start simulation') },
        { visible: running, label: l10n.t('Simulating...') },
        { visible: completed, label: l10n.t('Start over') },
    ];

    const progressList = (
        <StatusList
            ariaLabel={l10n.t('Simulated setup stages')}
            statusLabels={statusLabels}
            data-testid="wizard-stages"
        >
            {stageIds.map((stageId, index) => (
                <StatusListItem
                    key={stageId}
                    label={stageLabels[index]}
                    detail={stageDetails[index]}
                    reserveDetailSpace
                    status={getStageStatus(index)}
                    data-testid={`wizard-stage-${stageId}`}
                    data-state={getStageStatus(index)}
                />
            ))}
        </StatusList>
    );

    return (
        <div
            className="showcaseWizard"
            data-testid="showcase-wizard"
            data-state={step}
            data-completed-stages={completedStages}
        >
            {/* One persistent live region announces stages; the status list remains a readable receipt. */}
            <div
                className="showcaseWizard__announcer"
                role="status"
                aria-atomic="true"
                data-testid="wizard-announcement"
            >
                {running &&
                    l10n.t(
                        'Simulation, stage {0} of {1}: {2}.',
                        completedStages + 1,
                        stageIds.length,
                        stageLabels[completedStages] ?? '',
                    )}
                {completed && l10n.t('Simulation complete. No container or connection was created.')}
            </div>
            <Wizard
                activeStep={step}
                onStepChange={(value) => {
                    if (!stepsLocked && (value === 'introduction' || (value === 'configure' && configurationVisited))) {
                        setPhase(value);
                    }
                }}
                navPosition="top"
                headerBehavior="sticky-navigation"
                stepsLocked={stepsLocked}
                stepsAriaLabel={l10n.t('Local database setup steps')}
                overflowAriaLabel={(count) => l10n.t('More setup steps ({0})', count)}
                header={
                    <ContainerHeader
                        className="showcaseWizard__header"
                        media={<BoxMultipleRegular aria-hidden="true" />}
                        title={l10n.t('Wizard demo')}
                        subtitle={l10n.t('A guided local database setup, inspired by DocumentDB Local.')}
                    />
                }
                footer={
                    <ContainerFooter
                        className="showcaseWizard__footer"
                        note={l10n.t(
                            'Simulation only. No Docker commands, downloads, network requests, or files are created by setup.',
                        )}
                        contentEnd={
                            <Button appearance="secondary" onClick={showLearnMore} data-testid="wizard-learn-more">
                                {l10n.t('Learn more')}
                            </Button>
                        }
                    >
                        <Button
                            ref={primaryButtonRef}
                            appearance="primary"
                            onClick={completed ? reset : advance}
                            disabled={running || (phase === 'configure' && !configurationValid)}
                            data-testid={completed ? 'wizard-start-over' : 'wizard-next'}
                        >
                            {/* All captions reserve their wrapped size, so the footer cannot push the body on completion. */}
                            <span className="showcaseWizard__buttonLabels">
                                {primaryLabels.map(({ visible, label }) => (
                                    <span key={label} data-visible={visible} aria-hidden={!visible}>
                                        {label}
                                    </span>
                                ))}
                            </span>
                        </Button>
                        <Button
                            ref={secondaryButtonRef}
                            onClick={running ? cancel : () => setPhase('introduction')}
                            disabled={phase === 'introduction' || completed}
                            data-testid={running ? 'wizard-cancel' : 'wizard-back'}
                        >
                            <span className="showcaseWizard__buttonLabels">
                                <span data-visible={!running} aria-hidden={running}>
                                    {l10n.t('Back')}
                                </span>
                                <span data-visible={running} aria-hidden={!running}>
                                    {l10n.t('Cancel')}
                                </span>
                            </span>
                        </Button>
                    </ContainerFooter>
                }
            >
                {/* Keep these markers direct: Wizard reads their props to build navigation and focus headings. */}
                <WizardStep
                    value="introduction"
                    label={l10n.t('Introduction')}
                    title={l10n.t('Develop and test locally')}
                    subtitle={l10n.t(
                        'DocumentDB Local gives you a database for development and testing on your machine.',
                    )}
                    completed={configurationVisited}
                    navigable={!stepsLocked}
                >
                    <div className="showcaseWizard__content" data-testid="wizard-intro">
                        <div className="showcaseWizard__subsection">
                            <Text as="h3" size={400} weight="semibold">
                                {l10n.t('What will happen in the Set up step')}
                            </Text>
                            <ol className="showcaseWizard__plan" role="list">
                                <li>
                                    <CounterBadge aria-hidden count={1} />
                                    <div className="showcaseWizard__planCopy">
                                        <Text>{l10n.t('Verify your Docker setup')}</Text>
                                        <Text size={200}>
                                            {l10n.t('Confirms Docker can run containers on this machine.')}
                                        </Text>
                                    </div>
                                </li>
                                <li>
                                    <CounterBadge aria-hidden count={2} />
                                    <div className="showcaseWizard__planCopy">
                                        <Text>{l10n.t('Download the official image')}</Text>
                                        <Text size={200}>
                                            {l10n.t('Downloaded once, then reused for later setups.')}
                                        </Text>
                                    </div>
                                </li>
                                <li>
                                    <CounterBadge aria-hidden count={3} />
                                    <div className="showcaseWizard__planCopy">
                                        <Text>{l10n.t('Create and start the container')}</Text>
                                        <Text size={200}>
                                            {l10n.t('Uses the settings you choose in the next step.')}
                                        </Text>
                                    </div>
                                </li>
                                <li>
                                    <CounterBadge aria-hidden count={4} />
                                    <div className="showcaseWizard__planCopy">
                                        <Text>{l10n.t('Save the connection')}</Text>
                                        <Text size={200}>{l10n.t('Makes the local connection ready to open.')}</Text>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </div>
                </WizardStep>
                <WizardStep
                    value="configure"
                    label={l10n.t('Configure')}
                    title={l10n.t('Configure setup')}
                    subtitle={l10n.t('These defaults work for most people. Change them only if you need to.')}
                    completed={phase === 'provisioning' || completed}
                    navigable={!stepsLocked && configurationVisited}
                >
                    <form
                        className="showcaseWizard__form"
                        data-testid="wizard-config"
                        onSubmit={(event) => {
                            event.preventDefault();
                            advance();
                        }}
                    >
                        <Table size="small" aria-label={l10n.t('Setup settings')}>
                            <colgroup>
                                <col className="showcaseWizard__settingLabel" />
                                <col />
                                <col className="showcaseWizard__settingActions" />
                            </colgroup>
                            <TableBody>
                                {settings.map((setting) => (
                                    <Fragment key={setting.id}>
                                        <TableRow>
                                            <TableCell>
                                                <TableCellLayout appearance="primary">{setting.label}</TableCellLayout>
                                            </TableCell>
                                            <TableCell className="showcaseWizard__settingValue">
                                                {setting.value}
                                            </TableCell>
                                            <TableCell>
                                                <div className="showcaseWizard__settingAction">{setting.action}</div>
                                            </TableCell>
                                        </TableRow>
                                        {setting.editor && (
                                            <TableRow
                                                className="showcaseWizard__editorRow"
                                                aria-hidden={setting.open !== true}
                                            >
                                                <TableCell colSpan={3} className="showcaseWizard__editorCell">
                                                    <Reveal
                                                        id={`wizard-${setting.id}-editor`}
                                                        open={setting.open === true}
                                                    >
                                                        <div className="showcaseWizard__editorBody">
                                                            <div className="showcaseWizard__editFields">
                                                                {setting.editor}
                                                            </div>
                                                        </div>
                                                    </Reveal>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </Fragment>
                                ))}
                            </TableBody>
                        </Table>
                    </form>
                </WizardStep>
                <WizardStep
                    value="setup"
                    label={l10n.t('Set up')}
                    title={l10n.t('Setting up DocumentDB Local')}
                    subtitle={l10n.t('This can take a few minutes.')}
                    completed={phase === 'success'}
                    navigable={false}
                >
                    <div className="showcaseWizard__content" data-testid="wizard-progress">
                        {progressList}
                        <p>
                            {l10n.t('StatusList keeps stage labels and detail space stable as work completes.')}{' '}
                            <Link
                                href={`${componentDocs}/StatusList/README.md#reservedetailspace`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {l10n.t('Status list documentation')}
                            </Link>
                        </p>
                    </div>
                </WizardStep>
                <WizardStep
                    value="done"
                    label={l10n.t('Done')}
                    title={l10n.t('DocumentDB Local is ready')}
                    subtitle={l10n.t('The simulated setup completed successfully.')}
                    navigable={false}
                >
                    <div className="showcaseWizard__content" data-testid="wizard-done">
                        {progressList}
                        <MessageBar intent="success">
                            <MessageBarBody>
                                <MessageBarTitle>{l10n.t('All set')}</MessageBarTitle>
                                {l10n.t('The simulated local database is ready to use.')}
                            </MessageBarBody>
                        </MessageBar>
                        <div className="showcaseWizard__nextSteps">
                            <Text size={300}>{l10n.t('Next steps')}</Text>
                            <ul>
                                <li>{l10n.t('Use the example endpoint to connect your application.')}</li>
                                <li>{l10n.t('Start over to explore a different configuration.')}</li>
                            </ul>
                        </div>
                        <dl className="showcaseWizard__summary">
                            <div>
                                <dt>{l10n.t('Container name')}</dt>
                                <dd data-testid="wizard-summary-name">{defaultContainerName}</dd>
                            </div>
                            <div>
                                <dt>{l10n.t('Image')}</dt>
                                <dd data-testid="wizard-summary-image">{image}</dd>
                            </div>
                            <div>
                                <dt>{l10n.t('Sample products')}</dt>
                                <dd data-testid="wizard-summary-products">{includeSampleData ? 24 : 0}</dd>
                            </div>
                        </dl>
                        <Field
                            label={l10n.t('Example endpoint')}
                            hint={l10n.t('Illustrative only. No service was started at this address.')}
                        >
                            <Input readOnly value={endpoint} data-testid="wizard-endpoint" />
                        </Field>
                    </div>
                </WizardStep>
            </Wizard>
        </div>
    );
}
