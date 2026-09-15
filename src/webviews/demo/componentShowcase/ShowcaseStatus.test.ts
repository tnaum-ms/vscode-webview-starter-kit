import type * as React from 'react';
import { Children, isValidElement, useState, type JSX, type ReactElement, type ReactNode } from 'react';
import { ShowcaseStatus, ShowcaseSteps } from './ShowcaseStatus';

jest.mock('@fluentui/react-components', () =>
    Object.fromEntries(['Button', 'Divider', 'Link', 'Switch', 'Tooltip'].map((name) => [name, name])),
);
jest.mock('@fluentui/react-icons', () =>
    Object.fromEntries(['ArrowClockwiseRegular', 'ArrowRightRegular', 'DismissRegular'].map((name) => [name, name])),
);
jest.mock('@microsoft/vscode-ext-webview-fluentui/components', () =>
    Object.fromEntries(['StatusList', 'StatusListItem', 'StepList', 'StepListItem'].map((name) => [name, name])),
);
jest.mock('react', () => ({
    ...jest.requireActual<typeof React>('react'),
    useState: jest.fn(),
}));

interface ElementProps {
    children?: ReactNode;
    className?: string;
    value?: string;
    selectedValue?: string;
    checked?: boolean;
    completed?: boolean;
    navigable?: boolean;
    status?: string;
    disabled?: boolean;
    'data-testid'?: string;
    onClick?: () => void;
    onChange?: (event: unknown, data: { value?: string; checked?: boolean }) => void;
    onStepSelect?: (event: unknown, data: { value: string }) => void;
}

function elements(node: ReactNode): ReactElement<ElementProps>[] {
    return Children.toArray(node).flatMap((child) =>
        isValidElement<ElementProps>(child) ? [child, ...elements(child.props.children)] : [],
    );
}

function byTestId(tree: ReactNode, testId: string): ReactElement<ElementProps> {
    const element = elements(tree).find((child) => child.props['data-testid'] === testId);
    if (!element) throw new Error(`Missing showcase element: ${testId}`);
    return element;
}

function createRenderer(component: () => JSX.Element): () => ReactElement<ElementProps> {
    const states: unknown[] = [];
    return () => {
        let stateIndex = 0;
        // Match the wizard tests: exercise consumer state without mounting Fluent's DOM components.
        jest.mocked(useState).mockImplementation((initial?: unknown) => {
            const index = stateIndex++;
            if (index >= states.length) states.push(initial);
            return [
                states[index],
                (next: unknown): void => {
                    states[index] =
                        typeof next === 'function' ? (next as (previous: unknown) => unknown)(states[index]) : next;
                },
            ];
        });
        return component();
    };
}

describe('Independent component previews', () => {
    beforeEach(() => jest.clearAllMocks());

    it('keeps config and preview headings outside separate component frames', () => {
        for (const [component, expectedType, excludedType] of [
            [ShowcaseSteps, 'StepList', 'StatusList'],
            [ShowcaseStatus, 'StatusList', 'StepList'],
        ] as const) {
            const tree = createRenderer(component)();
            const children = Children.toArray(tree.props.children).filter(isValidElement<ElementProps>);
            const previewIndex = children.findIndex((child) => child.props.className === 'componentShowcase__sample');
            const preview = children[previewIndex];
            expect(previewIndex).toBeGreaterThan(0);
            expect(children[previewIndex - 1].type).toBe('h3');
            expect(children[previewIndex - 1].props.children).toBe('Component preview');
            expect(elements(preview).some((child) => child.props.children === 'Preview config')).toBe(false);
            expect(elements(preview).some((child) => child.props.children === 'Component preview')).toBe(false);
            expect(elements(preview).some((child) => child.type === expectedType)).toBe(true);
            expect(elements(tree).some((child) => child.type === excludedType)).toBe(false);
        }
    });

    it('supports next-step and optional direct StepList selection without changing pipeline state', () => {
        const renderSteps = createRenderer(ShowcaseSteps);
        const renderStatus = createRenderer(ShowcaseStatus);
        const summaryBefore = byTestId(renderStatus(), 'pipeline-summary').props.children;
        expect(elements(renderSteps()).find((child) => child.type === 'StepList')?.props.selectedValue).toBe('source');
        byTestId(renderSteps(), 'steps-next').props.onClick?.();
        const afterNext = renderSteps();
        expect(elements(afterNext).find((child) => child.type === 'StepList')?.props.selectedValue).toBe('build');
        expect(
            elements(afterNext).filter((child) => child.type === 'StepListItem' && child.props.completed),
        ).toHaveLength(1);
        expect(byTestId(renderStatus(), 'pipeline-summary').props.children).toBe(summaryBefore);
        expect(elements(renderSteps()).some((child) => child.type === 'Select')).toBe(false);

        const afterNextItems = elements(afterNext).filter((child) => child.type === 'StepListItem');
        expect(afterNextItems.map((step) => step.props.navigable)).toEqual([true, true, false, false, false, false]);

        elements(renderSteps())
            .find((child) => child.type === 'StepList')
            ?.props.onStepSelect?.(null, { value: 'health' });
        expect(elements(renderSteps()).find((child) => child.type === 'StepList')?.props.selectedValue).toBe('build');

        elements(renderSteps())
            .find((child) => child.type === 'StepList')
            ?.props.onStepSelect?.(null, { value: 'source' });
        const afterSelection = renderSteps();
        expect(elements(afterSelection).find((child) => child.type === 'StepList')?.props.selectedValue).toBe('source');
        expect(
            elements(afterSelection).filter((child) => child.type === 'StepListItem' && child.props.completed),
        ).toHaveLength(0);

        byTestId(renderSteps(), 'steps-selection').props.onChange?.(null, { checked: false });
        const disabled = renderSteps();
        expect(
            elements(disabled)
                .filter((child) => child.type === 'StepListItem')
                .every((step) => !step.props.navigable),
        ).toBe(true);
        elements(disabled)
            .find((child) => child.type === 'StepList')
            ?.props.onStepSelect?.(null, { value: 'build' });
        expect(elements(renderSteps()).find((child) => child.type === 'StepList')?.props.selectedValue).toBe('source');

        byTestId(renderSteps(), 'steps-selection').props.onChange?.(null, { checked: true });
        for (let step = 0; step < 5; step++) {
            byTestId(renderSteps(), 'steps-next').props.onClick?.();
        }
        const finished = renderSteps();
        expect(elements(finished).find((child) => child.type === 'StepList')?.props.selectedValue).toBe('traffic');
        expect(byTestId(finished, 'steps-next').props.disabled).toBe(true);
        expect(byTestId(renderStatus(), 'pipeline-summary').props.children).toBe(summaryBefore);
    });

    it('fails, retries, completes and resets statuses without changing the current StepList stage', () => {
        const renderSteps = createRenderer(ShowcaseSteps);
        const renderStatus = createRenderer(ShowcaseStatus);
        byTestId(renderSteps(), 'steps-next').props.onClick?.();

        byTestId(renderStatus(), 'pipeline-fail').props.onClick?.();
        expect(byTestId(renderStatus(), 'showcase-stage-build').props.status).toBe('error');
        expect(byTestId(renderStatus(), 'pipeline-advance').props.disabled).toBe(true);
        byTestId(renderStatus(), 'pipeline-advance').props.onClick?.();
        expect(byTestId(renderStatus(), 'showcase-stage-build').props.status).toBe('error');
        byTestId(renderStatus(), 'pipeline-retry').props.onClick?.();
        expect(byTestId(renderStatus(), 'showcase-stage-build').props.status).toBe('active');
        for (let stage = 0; stage < 5; stage++) {
            byTestId(renderStatus(), 'pipeline-advance').props.onClick?.();
        }
        expect(
            elements(renderStatus())
                .filter((child) => child.type === 'StatusListItem')
                .every((child) => child.props.status === 'done'),
        ).toBe(true);
        expect(byTestId(renderStatus(), 'pipeline-advance').props.disabled).toBe(true);
        byTestId(renderStatus(), 'pipeline-reset').props.onClick?.();
        expect(byTestId(renderStatus(), 'showcase-stage-build').props.status).toBe('active');
        expect(byTestId(renderStatus(), 'showcase-stage-security').props.status).toBe('warning');
        expect(elements(renderSteps()).find((child) => child.type === 'StepList')?.props.selectedValue).toBe('build');
    });
});
