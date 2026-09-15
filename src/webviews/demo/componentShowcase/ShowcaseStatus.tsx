import { Button, Divider, Link, Switch, Tooltip } from '@fluentui/react-components';
import { ArrowClockwiseRegular, ArrowRightRegular, DismissRegular } from '@fluentui/react-icons';
import {
    StatusList,
    StatusListItem,
    StepList,
    StepListItem,
    type StatusListItemStatus,
} from '@microsoft/vscode-ext-webview-fluentui/components';
import * as l10n from '@vscode/l10n';
import { useState, type JSX } from 'react';

const initialStatuses: StatusListItemStatus[] = ['done', 'active', 'warning', 'pending', 'pending', 'pending'];

interface ReleaseStage {
    value: string;
    label: string;
    detail: string;
}

function getReleaseStages(): ReleaseStage[] {
    return [
        { value: 'source', label: l10n.t('Source control'), detail: l10n.t('Release branch verified.') },
        { value: 'build', label: l10n.t('Build artifacts'), detail: l10n.t('Release artifacts signed.') },
        { value: 'security', label: l10n.t('Security scan'), detail: l10n.t('Dependency exceptions approved.') },
        { value: 'deploy', label: l10n.t('Regional deployment'), detail: l10n.t('West Europe deployment complete.') },
        { value: 'health', label: l10n.t('Health checks'), detail: l10n.t('All service endpoints healthy.') },
        { value: 'traffic', label: l10n.t('Traffic routing'), detail: l10n.t('Production traffic enabled.') },
    ];
}

export function ShowcaseSteps(): JSX.Element {
    const [currentStageIndex, setCurrentStageIndex] = useState(0);
    const [stepSelectionEnabled, setStepSelectionEnabled] = useState(true);
    const stages = getReleaseStages();
    const currentStage = stages[currentStageIndex];

    return (
        <div className="componentShowcase__stack" data-testid="showcase-steps">
            <p>{l10n.t('StepList shows the current stage in an ordered workflow.')}</p>
            <Link
                href="https://github.com/microsoft/vscode-documentdb/blob/main/packages/vscode-ext-webview-fluentui/src/components/StepList/README.md"
                target="_blank"
                rel="noopener noreferrer"
            >
                {l10n.t('StepList documentation')}
            </Link>
            <h3>{l10n.t('Preview config')}</h3>
            <div className="componentShowcase__actions">
                <Switch
                    label={l10n.t('Enable step selection')}
                    checked={stepSelectionEnabled}
                    onChange={(_event, data) => setStepSelectionEnabled(data.checked)}
                    data-testid="steps-selection"
                />
                <Button
                    appearance="primary"
                    icon={<ArrowRightRegular />}
                    disabled={currentStageIndex >= stages.length - 1}
                    onClick={() => setCurrentStageIndex((index) => Math.min(index + 1, stages.length - 1))}
                    data-testid="steps-next"
                >
                    {l10n.t('Next step')}
                </Button>
            </div>
            <Divider />
            <h3>{l10n.t('Component preview')}</h3>
            <section className="componentShowcase__sample" aria-label={l10n.t('StepList component preview')}>
                <StepList
                    selectedValue={currentStage?.value}
                    onStepSelect={(_event, data) => {
                        const selectedIndex = stages.findIndex((stage) => stage.value === data.value);
                        if (stepSelectionEnabled && selectedIndex >= 0 && selectedIndex <= currentStageIndex) {
                            setCurrentStageIndex(selectedIndex);
                        }
                    }}
                    ariaLabel={l10n.t('Release stages')}
                    overflowAriaLabel={(count) => l10n.t('More release stages ({0})', count)}
                >
                    {stages.map((stage, index) => (
                        <StepListItem
                            key={stage.value}
                            value={stage.value}
                            completed={index < currentStageIndex}
                            navigable={stepSelectionEnabled && index <= currentStageIndex}
                        >
                            {stage.label}
                        </StepListItem>
                    ))}
                </StepList>
            </section>
        </div>
    );
}

export function ShowcaseStatus(): JSX.Element {
    const [statuses, setStatuses] = useState<StatusListItemStatus[]>(initialStatuses);
    const stages = getReleaseStages();
    // Package defaults are English; consumers own every accessible status and overflow label.
    const statusLabels: Record<StatusListItemStatus, string> = {
        pending: l10n.t('Pending'),
        active: l10n.t('Active'),
        done: l10n.t('Done'),
        error: l10n.t('Error'),
        warning: l10n.t('Warning'),
    };
    const activeIndex = statuses.findIndex((status) => status === 'active');
    const errorIndex = statuses.findIndex((status) => status === 'error');
    const completeCount = statuses.filter((status) => status === 'done').length;
    const currentIndex = errorIndex >= 0 ? errorIndex : activeIndex;
    const currentStage = stages[currentIndex];
    const currentStatus = statuses[currentIndex];
    const announcement =
        currentStage && currentStatus
            ? l10n.t(
                  '{0}: {1}. {2} of {3} stages complete.',
                  currentStage.label,
                  statusLabels[currentStatus],
                  completeCount,
                  stages.length,
              )
            : l10n.t('Release ready. All {0} stages complete.', stages.length);

    function detail(index: number): string {
        switch (statuses[index]) {
            case 'active':
                return l10n.t('Processing release candidate.');
            case 'error':
                return l10n.t('Connection interrupted. Attempt failed.');
            case 'warning':
                return l10n.t('One dependency exception requires review.');
            case 'done':
                return stages[index]?.detail ?? '';
            default:
                return '';
        }
    }

    function advance(): void {
        if (activeIndex < 0 || errorIndex >= 0) {
            return;
        }
        const nextIndex = statuses.findIndex((status, index) => index > activeIndex && status !== 'done');
        setStatuses((previous) =>
            previous.map((status, index) => {
                if (index === activeIndex) {
                    return 'done';
                }
                if (index === nextIndex) {
                    return 'active';
                }
                return status;
            }),
        );
    }

    function fail(): void {
        if (activeIndex < 0) {
            return;
        }
        setStatuses((previous) => previous.map((status, index) => (index === activeIndex ? 'error' : status)));
    }

    function retry(): void {
        if (errorIndex < 0) {
            return;
        }
        setStatuses((previous) => previous.map((status, index) => (index === errorIndex ? 'active' : status)));
    }

    return (
        <div className="componentShowcase__stack" data-testid="showcase-status">
            <p>
                {l10n.t(
                    'StatusList shows progress and outcomes. Complete, fail, or retry release stages to explore each status.',
                )}
            </p>
            <Link
                href="https://github.com/microsoft/vscode-documentdb/blob/main/packages/vscode-ext-webview-fluentui/src/components/StatusList/README.md"
                target="_blank"
                rel="noopener noreferrer"
            >
                {l10n.t('StatusList documentation')}
            </Link>
            <h3>{l10n.t('Preview config')}</h3>
            <div className="componentShowcase__actions" role="group" aria-label={l10n.t('StatusList preview config')}>
                <Button
                    appearance="primary"
                    icon={<ArrowRightRegular />}
                    onClick={advance}
                    disabled={activeIndex < 0 || errorIndex >= 0}
                    data-testid="pipeline-advance"
                >
                    {l10n.t('Complete stage')}
                </Button>
                <Button icon={<DismissRegular />} onClick={fail} disabled={activeIndex < 0} data-testid="pipeline-fail">
                    {l10n.t('Fail stage')}
                </Button>
                <Button
                    icon={<ArrowClockwiseRegular />}
                    onClick={retry}
                    disabled={errorIndex < 0}
                    data-testid="pipeline-retry"
                >
                    {l10n.t('Retry stage')}
                </Button>
                <Tooltip content={l10n.t('Reset pipeline')} relationship="label">
                    <Button
                        icon={<ArrowClockwiseRegular />}
                        aria-label={l10n.t('Reset pipeline')}
                        onClick={() => {
                            setStatuses([...initialStatuses]);
                        }}
                        data-testid="pipeline-reset"
                    />
                </Tooltip>
            </div>
            <Divider />
            <h3>{l10n.t('Component preview')}</h3>
            <section className="componentShowcase__sample" aria-label={l10n.t('StatusList component preview')}>
                <p role="status" aria-atomic="true" data-testid="pipeline-summary">
                    {announcement}
                </p>
                <StatusList ariaLabel={l10n.t('Release stage status')} statusLabels={statusLabels}>
                    {stages.map((stage, index) => (
                        <StatusListItem
                            key={stage.value}
                            label={stage.label}
                            status={statuses[index] ?? 'pending'}
                            detail={detail(index)}
                            reserveDetailSpace
                            data-testid={`showcase-stage-${stage.value}`}
                        />
                    ))}
                </StatusList>
            </section>
        </div>
    );
}
