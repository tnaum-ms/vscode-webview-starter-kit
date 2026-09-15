import {
    Button,
    Divider,
    Field,
    Link,
    MessageBar,
    MessageBarBody,
    Select,
    Switch,
    Tab,
    TabList,
    Tooltip,
} from '@fluentui/react-components';
import { DataUsageRegular, FlowRegular, InfoRegular, OpenRegular, PanelLeftRegular } from '@fluentui/react-icons';
import {
    Container,
    ContainerBody,
    ContainerFooter,
    ContainerHeader,
    ContainerMain,
    ContainerNav,
    ContainerSection,
    FocusableBadge,
    MetricCard,
    MetricGrid,
    type MetricCardProps,
} from '@microsoft/vscode-ext-webview-fluentui/components';
import * as l10n from '@vscode/l10n';
import { useState, type JSX } from 'react';
import { useTrpcClient } from '../../_integration/useTrpcClient';
import { ShowcaseStatus, ShowcaseSteps } from './ShowcaseStatus';
import './componentShowcase.scss';

type ShowcaseTab = 'intro' | 'layout' | 'status' | 'metrics';
type MetricState = 'mixed' | 'ready' | 'loading' | 'unavailable';

function ShowcaseMetrics(): JSX.Element {
    const [appearance, setAppearance] = useState<'filled' | 'subtle'>('filled');
    const [size, setSize] = useState<'small' | 'large'>('large');
    const [dataState, setDataState] = useState<MetricState>('mixed');
    const numberFormat = new Intl.NumberFormat();
    const metrics: Pick<MetricCardProps, 'label' | 'value' | 'description'>[] = [
        {
            label: l10n.t('Requests'),
            value: numberFormat.format(12840),
            description: l10n.t('Requests received during the last hour.'),
        },
        {
            label: l10n.t('Failed requests'),
            value: 0,
            description: l10n.t('Requests that returned a server error during the last hour.'),
        },
        {
            label: l10n.t('Response time'),
            value: l10n.t('{0} ms', numberFormat.format(142)),
            description: l10n.t('Median response time during the last hour.'),
        },
        {
            label: l10n.t('Cache hit rate'),
            value: new Intl.NumberFormat(undefined, { style: 'percent', maximumFractionDigits: 1 }).format(0.984),
            description: l10n.t('Share of requests served from the cache during the last hour.'),
        },
    ];

    function metricValue(index: number): MetricCardProps['value'] {
        // undefined is still loading; null is unavailable. Zero is a real measurement.
        if (dataState === 'loading' || (dataState === 'mixed' && index === 2)) {
            return undefined;
        }
        if (dataState === 'unavailable' || (dataState === 'mixed' && index === 3)) {
            return null;
        }
        return metrics[index]?.value;
    }

    return (
        <div className="componentShowcase__stack" data-testid="showcase-metrics">
            <h3>{l10n.t('Preview config')}</h3>
            <div className="componentShowcase__controls" role="group" aria-label={l10n.t('Preview config')}>
                <Field label={l10n.t('Appearance')}>
                    <Select
                        data-testid="metric-appearance"
                        value={appearance}
                        onChange={(_event, data) => {
                            if (data.value === 'filled' || data.value === 'subtle') {
                                setAppearance(data.value);
                            }
                        }}
                    >
                        <option value="filled">{l10n.t('Filled')}</option>
                        <option value="subtle">{l10n.t('Subtle')}</option>
                    </Select>
                </Field>
                <Field label={l10n.t('Size')}>
                    <Select
                        data-testid="metric-size"
                        value={size}
                        onChange={(_event, data) => {
                            if (data.value === 'small' || data.value === 'large') {
                                setSize(data.value);
                            }
                        }}
                    >
                        <option value="small">{l10n.t('Small')}</option>
                        <option value="large">{l10n.t('Large')}</option>
                    </Select>
                </Field>
                <Field label={l10n.t('Data state')}>
                    <Select
                        data-testid="metric-state"
                        value={dataState}
                        onChange={(_event, data) => {
                            if (
                                data.value === 'mixed' ||
                                data.value === 'ready' ||
                                data.value === 'loading' ||
                                data.value === 'unavailable'
                            ) {
                                setDataState(data.value);
                            }
                        }}
                    >
                        <option value="mixed">{l10n.t('Mixed')}</option>
                        <option value="ready">{l10n.t('Ready')}</option>
                        <option value="loading">{l10n.t('Loading')}</option>
                        <option value="unavailable">{l10n.t('Unavailable')}</option>
                    </Select>
                </Field>
            </div>
            <Divider />
            <h3>{l10n.t('Component preview')}</h3>
            <section className="componentShowcase__sample" aria-label={l10n.t('Component preview')}>
                <MetricGrid className="componentShowcase__metrics">
                    {metrics.map((metric, index) => (
                        <MetricCard
                            key={index}
                            {...metric}
                            value={metricValue(index)}
                            appearance={appearance}
                            size={size}
                            loadingPlaceholder="skeleton"
                            nullValuePlaceholder={l10n.t('Unavailable')}
                            aria-busy={metricValue(index) === undefined}
                            data-testid={`showcase-metric-${index}`}
                        />
                    ))}
                </MetricGrid>
            </section>
        </div>
    );
}

function ShowcaseBadges(): JSX.Element {
    const [focusable, setFocusable] = useState(true);

    return (
        <div className="componentShowcase__stack">
            <h3>{l10n.t('Preview config')}</h3>
            <div className="componentShowcase__controls" role="group" aria-label={l10n.t('Preview config')}>
                <Switch
                    label={l10n.t('Keyboard focus')}
                    checked={focusable}
                    onChange={(_event, data) => setFocusable(data.checked)}
                />
            </div>
            <Divider />
            <h3>{l10n.t('Component preview')}</h3>
            <section className="componentShowcase__sample" aria-label={l10n.t('Component preview')}>
                <div className="componentShowcase__badges">
                    {/* Visible text names the badge; focus reveals its additional description. */}
                    <Tooltip
                        content={l10n.t('Production traffic is routed to West Europe.')}
                        relationship="description"
                    >
                        <FocusableBadge
                            shape="rounded"
                            focusable={focusable}
                            appearance="tint"
                            color="success"
                            data-testid="showcase-focusable-badge"
                        >
                            {l10n.t('Production')}
                        </FocusableBadge>
                    </Tooltip>
                    <FocusableBadge
                        shape="rounded"
                        focusable={false}
                        appearance="outline"
                        data-testid="showcase-decorative-badge"
                    >
                        {l10n.t('Read only')}
                    </FocusableBadge>
                </div>
            </section>
        </div>
    );
}

export function ComponentShowcase(): JSX.Element {
    const [selectedTab, setSelectedTab] = useState<ShowcaseTab>('intro');
    const trpcClient = useTrpcClient();
    const [openingWizard, setOpeningWizard] = useState(false);
    const [openError, setOpenError] = useState('');
    const tabLabels: Record<ShowcaseTab, string> = {
        intro: l10n.t('Intro'),
        layout: l10n.t('Layout & navigation'),
        status: l10n.t('Status'),
        metrics: l10n.t('Metrics & badges'),
    };

    async function openWizard(): Promise<void> {
        setOpeningWizard(true);
        setOpenError('');
        try {
            await trpcClient.demo.mainView.openShowcaseWizard.mutate();
        } catch (error) {
            setOpenError(
                l10n.t('Could not open the wizard demo: {0}', error instanceof Error ? error.message : String(error)),
            );
        } finally {
            setOpeningWizard(false);
        }
    }

    // The bootstrap provider owns theme/style setup; only the public component entry is imported here.
    return (
        <Container className="componentShowcase" data-testid="component-showcase">
            <ContainerBody
                navPosition="top"
                className="componentShowcase__body"
                role="region"
                aria-label={l10n.t('Component samples')}
            >
                <ContainerHeader title={l10n.t('Component Showcase')} />
                <ContainerNav>
                    <TabList
                        aria-label={l10n.t('Showcase categories')}
                        selectedValue={selectedTab}
                        onTabSelect={(_event, data) => {
                            if (
                                data.value === 'intro' ||
                                data.value === 'layout' ||
                                data.value === 'status' ||
                                data.value === 'metrics'
                            ) {
                                setSelectedTab(data.value);
                            }
                        }}
                        className="componentShowcase__tabs"
                    >
                        <Tab
                            id="showcase-tab-intro"
                            aria-controls="showcase-panel-intro"
                            value="intro"
                            icon={<InfoRegular />}
                        >
                            {tabLabels.intro}
                        </Tab>
                        <Tab
                            id="showcase-tab-layout"
                            aria-controls="showcase-panel-layout"
                            value="layout"
                            icon={<PanelLeftRegular />}
                        >
                            {tabLabels.layout}
                        </Tab>
                        <Tab
                            id="showcase-tab-status"
                            aria-controls="showcase-panel-status"
                            value="status"
                            icon={<FlowRegular />}
                        >
                            {tabLabels.status}
                        </Tab>
                        <Tab
                            id="showcase-tab-metrics"
                            aria-controls="showcase-panel-metrics"
                            value="metrics"
                            icon={<DataUsageRegular />}
                        >
                            {tabLabels.metrics}
                        </Tab>
                    </TabList>
                    <Divider className="componentShowcase__divider" />
                </ContainerNav>
                <ContainerMain>
                    <div
                        id="showcase-panel-intro"
                        role="tabpanel"
                        aria-labelledby="showcase-tab-intro"
                        hidden={selectedTab !== 'intro'}
                        tabIndex={0}
                        data-testid="showcase-intro"
                    >
                        <ContainerSection
                            title={l10n.t('Shared webview components')}
                            subtitle={l10n.t('Reusable building blocks for consistent VS Code extension experiences.')}
                        >
                            <div className="componentShowcase__stack">
                                <p>
                                    {l10n.t(
                                        'This showcase presents components from the @microsoft/vscode-ext-webview-fluentui package, which brings adaptive Fluent UI theming and reusable interface patterns to VS Code webviews.',
                                    )}
                                </p>
                                <p>
                                    {l10n.t(
                                        'These components are shared for use across VS Code extensions. The collection will grow as more reusable patterns are added over time.',
                                    )}
                                </p>
                                <div className="componentShowcase__links">
                                    <Link
                                        href="https://www.npmjs.com/package/@microsoft/vscode-ext-webview-fluentui"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {l10n.t('View package on npm')}
                                    </Link>
                                    <Link
                                        href="https://github.com/microsoft/vscode-documentdb/tree/main/packages/vscode-ext-webview-fluentui/src/components"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        {l10n.t('Browse component documentation')}
                                    </Link>
                                </div>
                            </div>
                        </ContainerSection>
                    </div>
                    <div
                        id="showcase-panel-layout"
                        role="tabpanel"
                        aria-labelledby="showcase-tab-layout"
                        hidden={selectedTab !== 'layout'}
                        tabIndex={0}
                    >
                        <ContainerSection
                            title={l10n.t('Wizard demo')}
                            subtitle={l10n.t('A full-page wizard inspired by DocumentDB local quick start.')}
                        >
                            <div className="componentShowcase__stack">
                                <p>
                                    {l10n.t(
                                        'Intro, container configuration, simulated setup progress, and a completion summary in a dedicated webview. No Docker commands run.',
                                    )}
                                </p>
                                <Link
                                    href="https://github.com/microsoft/vscode-documentdb/blob/main/packages/vscode-ext-webview-fluentui/src/components/Wizard/README.md"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    {l10n.t('Wizard documentation')}
                                </Link>
                                <div className="componentShowcase__actions">
                                    <Button
                                        appearance="primary"
                                        icon={<OpenRegular />}
                                        onClick={() => void openWizard()}
                                        disabled={openingWizard}
                                        data-testid="open-setup-wizard"
                                    >
                                        {l10n.t('Open wizard demo')}
                                    </Button>
                                </div>
                                {openError && (
                                    <MessageBar intent="error">
                                        <MessageBarBody>{openError}</MessageBarBody>
                                    </MessageBar>
                                )}
                            </div>
                        </ContainerSection>
                    </div>
                    <div
                        id="showcase-panel-status"
                        role="tabpanel"
                        aria-labelledby="showcase-tab-status"
                        hidden={selectedTab !== 'status'}
                        tabIndex={0}
                    >
                        <ContainerSection title={l10n.t('StatusList')}>
                            <ShowcaseStatus />
                        </ContainerSection>
                        <Divider className="componentShowcase__divider" />
                        <ContainerSection title={l10n.t('StepList')}>
                            <ShowcaseSteps />
                        </ContainerSection>
                    </div>
                    <div
                        id="showcase-panel-metrics"
                        role="tabpanel"
                        aria-labelledby="showcase-tab-metrics"
                        hidden={selectedTab !== 'metrics'}
                        tabIndex={0}
                    >
                        <ContainerSection title={l10n.t('Service metrics')}>
                            <p>
                                {l10n.t(
                                    'MetricGrid lays out measurements that distinguish loading, unavailable, and zero values. Adjust appearance and data below.',
                                )}
                            </p>
                            <Link
                                href="https://github.com/microsoft/vscode-documentdb/blob/main/packages/vscode-ext-webview-fluentui/src/components/MetricGrid/README.md"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {l10n.t('MetricGrid and MetricCard documentation')}
                            </Link>
                            <ShowcaseMetrics />
                        </ContainerSection>
                        <Divider className="componentShowcase__divider" />
                        <ContainerSection title={l10n.t('Badges')}>
                            <p>
                                {l10n.t(
                                    'FocusableBadge gives a status label keyboard focus and an optional tooltip, without turning it into a button.',
                                )}
                            </p>
                            <Link
                                href="https://github.com/microsoft/vscode-documentdb/blob/main/packages/vscode-ext-webview-fluentui/src/components/FocusableBadge/README.md"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                {l10n.t('FocusableBadge documentation')}
                            </Link>
                            <ShowcaseBadges />
                        </ContainerSection>
                    </div>
                </ContainerMain>
            </ContainerBody>
            <ContainerFooter className="componentShowcase__footer" contentEnd={l10n.t('Local session')}>
                <span>{tabLabels[selectedTab]}</span>
            </ContainerFooter>
        </Container>
    );
}
