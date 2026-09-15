import type * as React from 'react';
import {
    Children,
    isValidElement,
    useEffect,
    useRef,
    useState,
    type DependencyList,
    type ReactElement,
    type ReactNode,
} from 'react';
import { ShowcaseWizard } from './ShowcaseWizard';

jest.mock('./showcaseWizard.scss', () => ({}));
jest.mock('@fluentui/react-components', () =>
    Object.fromEntries(
        [
            'Button',
            'CounterBadge',
            'Field',
            'Input',
            'Link',
            'MessageBar',
            'MessageBarBody',
            'MessageBarTitle',
            'Switch',
            'Table',
            'TableBody',
            'TableCell',
            'TableCellLayout',
            'TableRow',
            'Text',
            'Tooltip',
        ].map((name) => [name, name]),
    ),
);
jest.mock('@fluentui/react-icons', () =>
    Object.fromEntries(['ArrowResetRegular', 'BoxMultipleRegular', 'EditRegular'].map((name) => [name, name])),
);
jest.mock('@microsoft/vscode-ext-webview-fluentui/components', () =>
    Object.fromEntries(
        ['ContainerFooter', 'ContainerHeader', 'StatusList', 'StatusListItem', 'Wizard', 'WizardStep'].map((name) => [
            name,
            name,
        ]),
    ),
);
jest.mock('react', () => ({
    ...jest.requireActual<typeof React>('react'),
    useEffect: jest.fn(),
    useRef: jest.fn(),
    useState: jest.fn(),
}));
const displayInformationMessage = jest.fn().mockResolvedValue(undefined);
jest.mock('../../_integration/useTrpcClient', () => ({
    useTrpcClient: () => ({ common: { displayInformationMessage: { mutate: displayInformationMessage } } }),
}));

interface ElementProps {
    children?: ReactNode;
    header?: ReactNode;
    footer?: ReactNode;
    action?: ReactNode;
    contentEnd?: ReactNode;
    activeStep?: string;
    value?: string;
    title?: string;
    subtitle?: string;
    label?: string;
    detail?: string;
    status?: string;
    completed?: boolean;
    reserveDetailSpace?: boolean;
    disabled?: boolean;
    checked?: boolean;
    open?: boolean;
    count?: number;
    'data-testid'?: string;
    'data-state'?: string;
    'data-completed-stages'?: number;
    onClick?: () => void;
    onStepChange?: (value: string) => void;
    onChange?: (event: unknown, data: { value?: string; checked?: boolean }) => void;
}

interface ScheduledEffect {
    dependencies?: DependencyList;
    cleanup?: () => void;
}

function elements(node: ReactNode): ReactElement<ElementProps>[] {
    return Children.toArray(node).flatMap((child) => {
        if (!isValidElement<ElementProps>(child)) return [];
        return [
            child,
            ...elements(child.props.children),
            ...elements(child.props.header),
            ...elements(child.props.footer),
            ...elements(child.props.action),
            ...elements(child.props.contentEnd),
        ];
    });
}

function byTestId(tree: ReactNode, testId: string): ReactElement<ElementProps> {
    const element = elements(tree).find((child) => child.props['data-testid'] === testId);
    if (!element) throw new Error(`Missing wizard element: ${testId}`);
    return element;
}

function byType(tree: ReactNode, type: string): ReactElement<ElementProps> {
    const element = elements(tree).find((child) => child.type === type);
    if (!element) throw new Error(`Missing wizard component: ${type}`);
    return element;
}

describe('ShowcaseWizard', () => {
    let states: unknown[];
    let refs: { current: unknown }[];
    let effects: ScheduledEffect[];
    let pendingEffects: (() => void)[];
    let stateIndex: number;
    let refIndex: number;
    let effectIndex: number;

    function renderWizard(): ReactElement<ElementProps> {
        stateIndex = 0;
        refIndex = 0;
        effectIndex = 0;
        pendingEffects = [];
        const tree = ShowcaseWizard();
        pendingEffects.forEach((effect) => effect());
        return tree;
    }

    function start(): ReactElement<ElementProps> {
        byTestId(renderWizard(), 'wizard-next').props.onClick?.();
        byTestId(renderWizard(), 'wizard-next').props.onClick?.();
        return renderWizard();
    }

    beforeEach(() => {
        jest.useFakeTimers();
        jest.clearAllMocks();
        states = [];
        refs = [];
        effects = [];
        Object.defineProperty(globalThis, 'document', { configurable: true, value: { activeElement: null } });
        // As in MonacoEditor.test.ts, exercise wrapper state/effects without rendering Fluent or requiring a DOM.
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
        jest.mocked(useRef).mockImplementation((initial?: unknown) => {
            const index = refIndex++;
            refs[index] ??= { current: initial };
            return refs[index];
        });
        jest.mocked(useEffect).mockImplementation((effect, dependencies) => {
            const index = effectIndex++;
            const previous = effects[index];
            if (
                previous &&
                dependencies &&
                dependencies.every((value, index) => Object.is(value, previous.dependencies?.[index]))
            )
                return;
            pendingEffects.push(() => {
                previous?.cleanup?.();
                const cleanup = effect();
                effects[index] = { dependencies, cleanup: typeof cleanup === 'function' ? cleanup : undefined };
            });
        });
    });

    afterEach(() => {
        effects.forEach((effect) => effect.cleanup?.());
        Reflect.deleteProperty(globalThis, 'document');
        jest.useRealTimers();
    });

    it('moves from setup to a separate done step with completed stages', () => {
        const running = start();
        const rowsBefore = elements(byTestId(running, 'wizard-stages')).filter(
            (element) => element.type === 'StatusListItem',
        );
        let completed = running;
        for (let stage = 0; stage < 5; stage++) {
            expect(jest.getTimerCount()).toBe(1);
            jest.advanceTimersByTime(900);
            completed = renderWizard();
        }
        completed = renderWizard();
        expect(byType(running, 'Wizard').props.activeStep).toBe('setup');
        expect(byType(completed, 'Wizard').props.activeStep).toBe('done');
        expect(
            elements(completed)
                .filter((element) => element.type === 'WizardStep')
                .map((element) => element.props.value),
        ).toEqual(['introduction', 'configure', 'setup', 'done']);
        expect(completed.props['data-state']).toBe('done');
        expect(completed.props['data-completed-stages']).toBe(5);
        const rowsAfter = elements(byTestId(completed, 'wizard-stages')).filter(
            (element) => element.type === 'StatusListItem',
        );
        expect(rowsAfter.map(({ key, props }) => [key, props.label, props.detail, props.reserveDetailSpace])).toEqual(
            rowsBefore.map(({ key, props }) => [key, props.label, props.detail, props.reserveDetailSpace]),
        );
        expect(rowsAfter.map((element) => element.props.status)).toEqual(Array<string>(5).fill('done'));
        expect(rowsAfter.every((element) => element.props.reserveDetailSpace)).toBe(true);
        expect(byTestId(completed, 'wizard-done')).toBeDefined();
        expect(jest.getTimerCount()).toBe(0);
    });

    it('preserves DocumentDB Local settings across Back and Cancel', () => {
        byTestId(renderWizard(), 'wizard-next').props.onClick?.();
        let tree = renderWizard();
        byTestId(tree, 'wizard-edit-port').props.onClick?.();
        byTestId(tree, 'wizard-edit-image').props.onClick?.();
        byTestId(tree, 'wizard-port').props.onChange?.(undefined, { value: '27018' });
        byTestId(tree, 'wizard-image-tag').props.onChange?.(undefined, { value: 'preview' });
        byTestId(tree, 'wizard-sample-data').props.onChange?.(undefined, { checked: false });
        byTestId(renderWizard(), 'wizard-back').props.onClick?.();
        byTestId(renderWizard(), 'wizard-next').props.onClick?.();
        tree = renderWizard();
        expect(byTestId(tree, 'wizard-port').props.value).toBe('27018');
        expect(byTestId(tree, 'wizard-image-tag').props.value).toBe('preview');
        expect(byTestId(tree, 'wizard-sample-data').props.checked).toBe(false);
        byTestId(tree, 'wizard-next').props.onClick?.();
        byTestId(renderWizard(), 'wizard-cancel').props.onClick?.();
        tree = renderWizard();
        expect(byTestId(tree, 'wizard-port').props.value).toBe('27018');
        expect(jest.getTimerCount()).toBe(0);
    });

    it.each(['', '0', '1023', '65536', '1e4', '1.5', '-1'])(
        'blocks invalid port %p even when advance is called directly',
        (port) => {
            byTestId(renderWizard(), 'wizard-next').props.onClick?.();
            byTestId(renderWizard(), 'wizard-port').props.onChange?.(undefined, { value: port });
            const tree = renderWizard();
            expect(byTestId(tree, 'wizard-next').props.disabled).toBe(true);
            byTestId(tree, 'wizard-next').props.onClick?.();
            expect(renderWizard().props['data-state']).toBe('configure');
            expect(jest.getTimerCount()).toBe(0);
        },
    );

    it('validates custom credentials and resets defaults after completion', () => {
        byTestId(renderWizard(), 'wizard-next').props.onClick?.();
        byTestId(renderWizard(), 'wizard-auto-credentials').props.onChange?.(undefined, { checked: false });
        expect(byTestId(renderWizard(), 'wizard-next').props.disabled).toBe(true);
        byTestId(renderWizard(), 'wizard-username').props.onChange?.(undefined, { value: 'developer' });
        byTestId(renderWizard(), 'wizard-password').props.onChange?.(undefined, { value: 'password' });
        expect(byTestId(renderWizard(), 'wizard-next').props.disabled).toBe(false);
        let tree = start();
        for (let stage = 0; stage < 5; stage++) {
            jest.advanceTimersByTime(900);
            tree = renderWizard();
        }
        tree = renderWizard();
        byTestId(tree, 'wizard-start-over').props.onClick?.();
        byTestId(renderWizard(), 'wizard-next').props.onClick?.();
        tree = renderWizard();
        expect(byTestId(tree, 'wizard-next').props.disabled).toBe(false);
        expect(byTestId(tree, 'wizard-port').props.value).toBe('10260');
        expect(byTestId(tree, 'wizard-sample-data').props.checked).toBe(true);
    });

    it('clears timers on reset and unmount and locks in-flight step navigation', () => {
        let tree = start();
        byType(tree, 'Wizard').props.onStepChange?.('introduction');
        tree = renderWizard();
        expect(tree.props['data-state']).toBe('setup');
        expect(jest.getTimerCount()).toBe(1);
        effects.forEach((effect) => effect.cleanup?.());
        expect(jest.getTimerCount()).toBe(0);
    });

    it('removes the header action and opens Learn more through the common modal procedure', () => {
        const running = start();
        expect(byType(running, 'ContainerHeader').props.title).toBe('Wizard demo');
        expect(byType(running, 'ContainerHeader').props.action).toBeUndefined();
        byTestId(running, 'wizard-learn-more').props.onClick?.();
        expect(displayInformationMessage).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'About the wizard demo', modal: true }),
        );
        for (let stage = 0; stage < 5; stage++) {
            jest.advanceTimersByTime(900);
            renderWizard();
        }
        const completed = renderWizard();
        expect(byTestId(completed, 'wizard-start-over').props.disabled).toBe(false);
        expect(byTestId(completed, 'wizard-back').props.disabled).toBe(true);
        expect(
            elements(byType(completed, 'ContainerFooter')).filter((element) => element.type === 'Button'),
        ).toHaveLength(3);
        byTestId(completed, 'wizard-start-over').props.onClick?.();
        expect(renderWizard().props['data-state']).toBe('introduction');
    });

    it('uses Fluent Text and CounterBadge for the introduction plan', () => {
        const intro = renderWizard();
        const badges = elements(intro).filter((element) => element.type === 'CounterBadge');
        expect(badges.map((badge) => badge.props.count)).toEqual([1, 2, 3, 4]);
        expect(
            elements(intro).some(
                (element) =>
                    element.type === 'Text' && element.props.children === 'What will happen in the Set up step',
            ),
        ).toBe(true);
    });
});
