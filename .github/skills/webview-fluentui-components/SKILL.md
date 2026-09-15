---
name: webview-fluentui-components
description: Use the shared Fluent UI component families shipped by @microsoft/vscode-ext-webview-fluentui in VS Code webviews. Use when building or reviewing Container layouts, Wizard flows, StepList navigation, StatusList progress, MetricGrid dashboards, FocusableBadge labels, component accessibility, keyboard behavior, live announcements, loading or unavailable metric states, or component showcase examples. Does not cover tRPC transport or general React architecture.
---

# Webview Fluent UI Components

Use the six shared component families from `@microsoft/vscode-ext-webview-fluentui/components` without weakening their state or accessibility contracts.

**Related skills**:

- **react-webview-architecture** — provider composition, React state, effects, SCSS, and Monaco
- **webview-trpc-messaging** — procedures, cancellation, telemetry, and opening panels from webviews

**Detailed reference**: See [references/COMPONENT_ACCESSIBILITY.md](./references/COMPONENT_ACCESSIBILITY.md).

## Public Package Boundaries

```tsx
import { VSCodeFluentProvider } from '@microsoft/vscode-ext-webview-fluentui';
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
  StatusList,
  StatusListItem,
  StepList,
  StepListItem,
  Wizard,
  WizardStep,
} from '@microsoft/vscode-ext-webview-fluentui/components';
```

Use only the root, `/components`, and `/monaco` public entries. Never import package `src`, `dist`, or CSS paths.

The root import injects adaptive CSS once per document. `/components` does not inject it. Components can run under any Fluent UI v9 provider, but this starter kit wraps every view in `VSCodeFluentProvider`.

## Catalog

| Family         | Exports                                                                                                                 | Use for                                                    |
| -------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Container      | `Container`, `ContainerBody`, `ContainerHeader`, `ContainerNav`, `ContainerMain`, `ContainerSection`, `ContainerFooter` | Full-height shells and structured regions                  |
| Wizard         | `Wizard`, `WizardStep`                                                                                                  | Controlled, guided, multi-step flows                       |
| StepList       | `StepList`, `StepListItem`                                                                                              | Current/completed workflow navigation                      |
| StatusList     | `StatusList`, `StatusListItem`                                                                                          | Progress, warning, failure, and completion evidence        |
| MetricGrid     | `MetricGrid`, `MetricCard`                                                                                              | Responsive operational measurements                        |
| FocusableBadge | `FocusableBadge`                                                                                                        | Named status labels that may expose a description on focus |

These are 16 exports across six families. Standard buttons, inputs, tabs, tooltips, and dialogs still come from `@fluentui/react-components`.

## Rules That Apply to Every Family

1. Localize visible copy, labels, status words, tooltip descriptions, and overflow labels with `l10n.t()`.
2. Treat package English defaults as fallbacks, not as consumer translations.
3. Keep state controlled where the component exposes controlled props; the consumer owns validation and transition rules.
4. Use semantic Fluent controls for actions. Do not make status rows or badges look actionable unless they perform an action.
5. Preserve focus order, disabled behavior, stable layout, and reduced-motion behavior.
6. Verify narrow-width overflow and keyboard behavior, not only the default desktop layout.

## Family Contracts

### Container

Compose the named regions instead of rebuilding the shell with arbitrary wrappers. Use one logical `main` landmark. `Wizard` already owns one, so do not nest it in another `main`.

Use `ContainerFooter.contentEnd` for trailing content. Keep full-page shells height-constrained and let the body/main region own scrolling.

### Wizard

- `Wizard` is controlled through `activeStep` and `onStepChange`.
- Render `WizardStep` elements as direct children, not through fragments or custom wrappers; the wizard reads their props for navigation and heading focus.
- Only the active step mounts. Store form values and durable workflow state above the steps.
- The consumer owns validation, `completed`, `navigable`, button behavior, and `stepsLocked` while work is running.
- Localize `stepsAriaLabel` and `overflowAriaLabel`.
- The root defaults to a viewport-height `Container`; let its body scroll rather than forcing a bounded embedded height.

Use a separate Done step when completion has distinct content and actions. Reserve footer label geometry when captions change so focus and content do not jump.

### StepList

- Control the current step with `selectedValue` and `onStepSelect`.
- Mark earlier stages with `completed`; make only valid destinations `navigable`.
- Put the list in a parent that can shrink with `min-width: 0` so overflow works.
- Localize both `ariaLabel` and the count-aware `overflowAriaLabel`.
- Do not use the reserved `vertical` prop; vertical rendering is not implemented in package version 1.1.0.

### StatusList

- Supply localized `statusLabels` for `pending`, `active`, `done`, `error`, and `warning`.
- Use `reserveDetailSpace` when details appear asynchronously and row movement would be disruptive.
- `StatusList` intentionally does not announce updates. Add one concise `role="status"` or `Announcer` summary around meaningful workflow transitions.
- Keep the list itself readable as current state or a final receipt; do not duplicate every row into the live announcement.

### MetricGrid

Treat values distinctly:

| Value       | Meaning          |
| ----------- | ---------------- |
| `undefined` | Loading          |
| `null`      | Unavailable      |
| `0`         | Real measurement |

Provide `loadingPlaceholder`, a localized `nullValuePlaceholder`, and `aria-busy` while loading. Format values in the consumer with `Intl`; do not make a metric card interactive unless it performs a documented action.

### FocusableBadge

Visible badge content supplies its accessible name. If focus should reveal extra context, wrap it in a localized Fluent `Tooltip` with `relationship="description"`.

Set `focusable={false}` for decorative or already-explained badges. A focusable badge remains a status label, not a button; do not invent action semantics. This component comes from `/components`, not `src/webviews/components/`.

## Current Examples

| Concern                                     | Source                                                                              |
| ------------------------------------------- | ----------------------------------------------------------------------------------- |
| Container, MetricGrid, FocusableBadge       | `src/webviews/demo/componentShowcase/ComponentShowcase.tsx`                         |
| Controlled StepList and StatusList          | `src/webviews/demo/componentShowcase/ShowcaseStatus.tsx`                            |
| Full-page Wizard and persistent live region | `src/webviews/demo/componentShowcase/ShowcaseWizard.tsx`                            |
| Layout and responsive styling               | `src/webviews/demo/componentShowcase/componentShowcase.scss`, `showcaseWizard.scss` |
| Behavior tests                              | `src/webviews/demo/componentShowcase/*.test.ts`                                     |
| Full package and showcase notes             | `docs/component-showcase.md`                                                        |

## Before Finishing

- Test keyboard navigation, focus visibility, disabled actions, and focus after step changes.
- Test loading, unavailable, zero, warning, error, retry, reset, cancellation, and completion states that apply.
- Confirm dynamic updates produce one useful announcement, not repeated row-level noise.
- Check narrow widths, overflow menus, long localized strings, zoom, and reduced motion.
- Run focused component tests, then the repository formatting and lint checks.
