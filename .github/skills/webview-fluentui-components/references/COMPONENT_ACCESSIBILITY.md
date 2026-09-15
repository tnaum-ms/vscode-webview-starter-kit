# Component Accessibility Reference

Detailed implementation guidance for the six component families exported by `@microsoft/vscode-ext-webview-fluentui/components` 1.1.0.

## Shared Setup

The starter kit configures localization and the adaptive provider once in `src/webviews/index.tsx`. Component code should import components only from `/components`:

```tsx
import { VSCodeFluentProvider } from '@microsoft/vscode-ext-webview-fluentui';
import { MetricCard, MetricGrid } from '@microsoft/vscode-ext-webview-fluentui/components';

root.render(
  <VSCodeFluentProvider>
    <App />
  </VSCodeFluentProvider>,
);
```

The package's root stylesheet and Fluent's Griffel runtime need `style-src 'unsafe-inline'`. Keep script restrictions separate. The `/components` entry has no stylesheet side effect.

## Container Composition

`Container` supplies the outer shell. Compose its regions according to the information architecture:

```tsx
<Container>
  <ContainerBody navPosition="top">
    <ContainerHeader title={l10n.t('Service health')} />
    <ContainerNav>{navigation}</ContainerNav>
    <ContainerMain>
      <ContainerSection title={l10n.t('Overview')}>{content}</ContainerSection>
    </ContainerMain>
  </ContainerBody>
  <ContainerFooter contentEnd={trailingContent}>{actions}</ContainerFooter>
</Container>
```

- Keep exactly one logical main landmark in the experience.
- Label additional `region` landmarks only when the label helps navigation.
- Let the main/body region scroll; keep headers, navigation, or footers sticky only when they remain useful at high zoom.
- Use `contentEnd` for a trailing action or note instead of manually positioning it.

## Wizard

### State model

The wizard renders navigation from direct `WizardStep` props. Model the active value as a finite union and validate transitions in `onStepChange`:

```tsx
type Step = 'introduction' | 'configure' | 'setup' | 'done';

<Wizard
  activeStep={step}
  onStepChange={(value) => {
    if (!stepsLocked && isAllowedStep(value)) {
      setStep(value);
    }
  }}
  stepsLocked={stepsLocked}
  stepsAriaLabel={l10n.t('Setup steps')}
  overflowAriaLabel={(count) => l10n.t('More setup steps ({0})', count)}
>
  <WizardStep value="introduction" label={l10n.t('Introduction')} title={l10n.t('Get started')}>
    {introduction}
  </WizardStep>
  <WizardStep value="configure" label={l10n.t('Configure')} title={l10n.t('Choose settings')}>
    {configuration}
  </WizardStep>
</Wizard>;
```

Do not put `WizardStep` elements in fragments or custom wrapper components. Only active content mounts, so place values, validation state, running state, and completion state in the parent.

### Navigation and focus

- Mark a step `navigable` only when revisiting it is valid.
- Set `completed` from workflow state; do not infer completion from visual position alone.
- Lock navigation and disable conflicting actions while an operation is running.
- The wizard focuses the active step heading after a change. Avoid competing focus effects unless opening a specific editor requires one.
- `Wizard` owns a `main` landmark. Do not place it inside `ContainerMain` or another `main`.

### Validation and asynchronous work

- Prevent advancement while required fields are invalid.
- Keep errors adjacent to their fields through Fluent `Field` validation props.
- Cancellation must clear timers or abort operations and restore a coherent step/action state.
- Keep one persistent live region outside step content so it is not unmounted during a transition.
- If button captions change, reserve enough geometry for every caption to avoid moving the focused control.

The package 1.1.0 wizard root defaults to `100vh` and does not expose root `className` or `style`. Style a surrounding webview root and let the wizard body scroll.

## StepList

`StepList` is navigation for an ordered process, not status evidence. Keep selection controlled:

```tsx
<StepList
  selectedValue={currentStep}
  onStepSelect={(_event, data) => selectAllowedStep(data.value)}
  ariaLabel={l10n.t('Release stages')}
  overflowAriaLabel={(count) => l10n.t('More release stages ({0})', count)}
>
  {steps.map((step, index) => (
    <StepListItem
      key={step.value}
      value={step.value}
      completed={index < currentIndex}
      navigable={index <= currentIndex}
    >
      {step.label}
    </StepListItem>
  ))}
</StepList>
```

- Validate `data.value` before updating a narrowed step union.
- Future or otherwise invalid destinations remain non-navigable.
- Add `min-width: 0` to the shrinking parent so overflow measurement is meaningful.
- Localize both the list label and overflow-menu label.
- The `vertical` prop is reserved and does not render vertically in 1.1.0.

The installed Fluent dependency set can produce a `Maximum update depth exceeded` error in `StepOverflowMenu` near an overflow boundary. The starter kit reproduces this around a 960 px CSS viewport and does not apply an application workaround. If encountered, isolate it as a package/dependency issue before changing workflow state logic.

## StatusList

`StatusList` presents state and evidence. It is intentionally silent to assistive technology unless the consumer adds an announcement:

```tsx
const statusLabels: Record<StatusListItemStatus, string> = {
  pending: l10n.t('Pending'),
  active: l10n.t('Active'),
  done: l10n.t('Done'),
  error: l10n.t('Error'),
  warning: l10n.t('Warning'),
};

<p role="status" aria-atomic="true">{workflowSummary}</p>
<StatusList ariaLabel={l10n.t('Release stage status')} statusLabels={statusLabels}>
  <StatusListItem
    label={l10n.t('Build artifacts')}
    status="active"
    detail={l10n.t('Signing release artifacts.')}
    reserveDetailSpace
  />
</StatusList>
```

- Announce a concise aggregate such as stage name, status, and progress count.
- Do not add live behavior to every row; that creates duplicate or noisy output.
- Use `reserveDetailSpace` when asynchronous details would otherwise shift rows.
- Keep warning and error evidence visible until the user resolves or resets it.
- A finished list can remain as a readable receipt on the Done step.

## MetricGrid

Metric values have three distinct states in addition to an ordinary value:

```tsx
<MetricGrid>
  <MetricCard label={l10n.t('Failed requests')} value={0} />
  <MetricCard label={l10n.t('Response time')} value={undefined} loadingPlaceholder="skeleton" aria-busy />
  <MetricCard label={l10n.t('Cache hit rate')} value={null} nullValuePlaceholder={l10n.t('Unavailable')} />
</MetricGrid>
```

- `undefined` means loading.
- `null` means unavailable.
- `0` is data and must not fall through to either placeholder.
- Format numbers, durations, percentages, and units with `Intl` in the consumer.
- Use a useful description where the time range or interpretation is not obvious.
- Set `aria-busy` only while the individual metric is loading.
- Avoid turning every metric into a card-shaped action. Add interaction only when it has a real destination or command.

## FocusableBadge

Use `FocusableBadge` when a short visible status needs optional keyboard-reachable context:

```tsx
<Tooltip content={l10n.t('Production traffic is routed to West Europe.')} relationship="description">
  <FocusableBadge shape="rounded" focusable appearance="tint" color="success">
    {l10n.t('Production')}
  </FocusableBadge>
</Tooltip>
```

- Visible content is the badge's name.
- The tooltip adds a description, so use `relationship="description"`, not `label`.
- The badge does not become a button merely because it can receive focus.
- Set `focusable={false}` when the badge is decorative, redundant, or has no additional focus-only information.
- Keep the tooltip text localized and useful without repeating the badge word.

## Verification Matrix

| Area          | Verify                                                                                            |
| ------------- | ------------------------------------------------------------------------------------------------- |
| Keyboard      | Tab order, focus ring, overflow menu, step selection, disabled controls, focus after step changes |
| Screen reader | Landmarks, names, descriptions, one useful live summary, no duplicate announcements               |
| State         | Validation, loading, unavailable, zero, warning, error, retry, reset, cancellation, Done          |
| Layout        | 360 px width, desktop width, long localization, 200% zoom, stable changing labels/details         |
| Motion        | `prefers-reduced-motion`, no transition required to understand state                              |
| Lifecycle     | Timers, subscriptions, requests, and listeners cleaned up on cancellation and unmount             |

Use the focused tests under `src/webviews/demo/componentShowcase/` as executable examples. The standalone browser preview is useful for responsive interaction checks but does not exercise the Extension Host, production CSP, or real tRPC transport.
