import type * as React from 'react';
import { Children, isValidElement, useState, type ReactElement, type ReactNode } from 'react';
import { ComponentShowcase } from './ComponentShowcase';

jest.mock('./componentShowcase.scss', () => ({}));
jest.mock('@fluentui/react-components', () =>
    Object.fromEntries(
        [
            'Button',
            'Divider',
            'Field',
            'Link',
            'MessageBar',
            'MessageBarBody',
            'Select',
            'Switch',
            'Tab',
            'TabList',
            'Tooltip',
        ].map((name) => [name, name]),
    ),
);
jest.mock('@fluentui/react-icons', () =>
    Object.fromEntries(
        ['DataUsageRegular', 'FlowRegular', 'InfoRegular', 'OpenRegular', 'PanelLeftRegular'].map((name) => [
            name,
            name,
        ]),
    ),
);
jest.mock('@microsoft/vscode-ext-webview-fluentui/components', () =>
    Object.fromEntries(
        [
            'Container',
            'ContainerBody',
            'ContainerFooter',
            'ContainerHeader',
            'ContainerMain',
            'ContainerNav',
            'ContainerSection',
            'FocusableBadge',
            'MetricCard',
            'MetricGrid',
        ].map((name) => [name, name]),
    ),
);
jest.mock('./ShowcaseStatus', () => ({
    ShowcaseStatus: () => 'status preview',
    ShowcaseSteps: () => 'steps preview',
}));
jest.mock('../../_integration/useTrpcClient', () => ({
    useTrpcClient: () => ({ demo: { mainView: { openShowcaseWizard: { mutate: jest.fn() } } } }),
}));
jest.mock('react', () => ({
    ...jest.requireActual<typeof React>('react'),
    useState: jest.fn(),
}));

interface ElementProps {
    children?: ReactNode;
    id?: string;
    hidden?: boolean;
    selectedValue?: string;
    title?: string;
    'data-testid'?: string;
    onTabSelect?: (event: unknown, data: { value: string }) => void;
}

function elements(node: ReactNode): ReactElement<ElementProps>[] {
    return Children.toArray(node).flatMap((child) =>
        isValidElement<ElementProps>(child) ? [child, ...elements(child.props.children)] : [],
    );
}

function textContent(node: ReactNode): string {
    return Children.toArray(node)
        .map((child) => {
            if (isValidElement<ElementProps>(child)) {
                return textContent(child.props.children);
            }
            return typeof child === 'string' || typeof child === 'number' || typeof child === 'bigint'
                ? String(child)
                : '';
        })
        .join(' ');
}

function findElement(
    tree: ReactNode,
    predicate: (element: ReactElement<ElementProps>) => boolean,
): ReactElement<ElementProps> {
    const element = elements(tree).find(predicate);
    if (!element) throw new Error('Missing showcase element');
    return element;
}

describe('ComponentShowcase', () => {
    let states: unknown[];

    function renderShowcase(): ReactElement<ElementProps> {
        let stateIndex = 0;
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
        return ComponentShowcase();
    }

    beforeEach(() => {
        states = [];
        jest.clearAllMocks();
    });

    it('opens on an Intro tab that describes the shared and growing component package', () => {
        const tree = renderShowcase();
        expect(findElement(tree, (element) => element.type === 'TabList').props.selectedValue).toBe('intro');
        expect(findElement(tree, (element) => element.props.id === 'showcase-panel-intro').props.hidden).toBe(false);
        expect(findElement(tree, (element) => element.props.id === 'showcase-panel-layout').props.hidden).toBe(true);

        const intro = findElement(tree, (element) => element.props['data-testid'] === 'showcase-intro');
        expect(textContent(intro)).toContain('@microsoft/vscode-ext-webview-fluentui');
        expect(textContent(intro)).toContain('shared for use across VS Code extensions');
        expect(textContent(intro)).toContain('grow as more reusable patterns are added over time');
    });

    it('switches from Intro to another showcase tab', () => {
        let tree = renderShowcase();
        findElement(tree, (element) => element.type === 'TabList').props.onTabSelect?.(null, { value: 'status' });
        tree = renderShowcase();

        expect(findElement(tree, (element) => element.props.id === 'showcase-panel-intro').props.hidden).toBe(true);
        expect(findElement(tree, (element) => element.props.id === 'showcase-panel-status').props.hidden).toBe(false);
    });
});
