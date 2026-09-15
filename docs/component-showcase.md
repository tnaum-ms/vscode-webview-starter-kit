# Component Showcase

The starter kit uses `@microsoft/vscode-ext-webview-fluentui` at `~1.1.0` for Fluent
theming, components, and Monaco theme data. The showcase covers **six families with
16 named component exports** from `/components`, not the standard buttons, inputs,
tabs, or tooltips from `@fluentui/react-components` that the demo also uses.

The showcase opens on an **Intro** tab that describes the shared package and links to
its npm listing and component documentation. Additional reusable component patterns
will be added to the package and this showcase over time.

## Try It

1. From the current source, run `npm install` and `npm run build`.
2. Press **F5**. In the Main View, select **Component Showcase**, read the introduction,
   and choose **Open Component Showcase** to open a separate panel.
3. Start with **Intro**, then in **Layout & navigation** choose **Open wizard demo** for the independent,
   full-viewport **Wizard demo** panel (`showcaseWizard`). Command Palette
   shortcuts are **Webview Starter Kit: Open Component Showcase** and
   **Webview Starter Kit: Open wizard demo**.
4. Alternatively, run `npm run watch:views` and open
   http://127.0.0.1:18080/static/component-showcase.html for a standalone browser preview.

The **v2.0.0 VSIX does not contain these commands**; use source or a new build.
The [preview HTML](../src/webviews/static/component-showcase.html) imports bundled `../views.js`
and supplies sample theme tokens. Routes use this same HTML: no query defaults to
`componentShowcase`; http://127.0.0.1:18080/static/component-showcase.html?view=showcaseWizard
opens **Wizard demo**, and `?view=mainView` opens the Main View.
The minimal tRPC mock allowlists launch and modal information procedures and rejects
unsupported procedures; it does not implement general host functionality. Browser
interaction does not exercise the real Extension Host, webview CSP, or a full release.

Upstream visuals: [Wizard][wizard-image] and [StatusList][status-image] screenshots (not the local demo).

## Shipped Components

All exports below come from `@microsoft/vscode-ext-webview-fluentui/components`.
Family links explain usage and accessibility; local links show composition and state.

| Family                  | Named component exports                                                                                                 | Local example                                                                                                                                                    |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [Container][container]  | `Container`, `ContainerBody`, `ContainerHeader`, `ContainerNav`, `ContainerMain`, `ContainerSection`, `ContainerFooter` | [ComponentShowcase.tsx](../src/webviews/demo/componentShowcase/ComponentShowcase.tsx): shell, category navigation, content sections, and pinned footer           |
| [Wizard][wizard]        | `Wizard`, `WizardStep`                                                                                                  | [ShowcaseWizard.tsx](../src/webviews/demo/componentShowcase/ShowcaseWizard.tsx): separate full-page setup simulation, from introduction through completion       |
| [StepList][steps]       | `StepList`, `StepListItem`                                                                                              | [ShowcaseStatus.tsx](../src/webviews/demo/componentShowcase/ShowcaseStatus.tsx): controlled release-stage selection with overflow navigation                     |
| [StatusList][status]    | `StatusList`, `StatusListItem`                                                                                          | [ShowcaseStatus.tsx](../src/webviews/demo/componentShowcase/ShowcaseStatus.tsx): stage evidence, localized status words, failure and retry                       |
| [MetricGrid][metrics]   | `MetricGrid`, `MetricCard`                                                                                              | [ComponentShowcase.tsx](../src/webviews/demo/componentShowcase/ComponentShowcase.tsx): responsive service metrics with appearance, size, and data-state controls |
| [FocusableBadge][badge] | `FocusableBadge`                                                                                                        | [ComponentShowcase.tsx](../src/webviews/demo/componentShowcase/ComponentShowcase.tsx): keyboard-accessible Production tooltip and non-focusable Read only badge  |

## Explore the Workflows

The Main View keeps its original, compact demos and a short showcase introduction
with a launch button. Descriptions and component documentation links live in the
showcase. The wizard links to guidance on composition, controlled step state, and
reserved status details. Each **Component preview** heading sits above, outside
its dashed border; **Preview config** controls remain separate from the sample.

- **Layout & navigation:** a horizontal `Divider` separates the showcase tabs from
  their content. **Open wizard demo** launches a dedicated panel inspired by
  DocumentDB Local's quick start. The introduction uses numbered circular discs for
  its four plan items; those items are not additional wizard navigation markers.
- **Wizard demo:** four navigation markers, **Introduction -> Configure -> Set up -> Done**.
  The introduction follows DocumentDB Local's Fluent `Text` and `CounterBadge` composition.
  Configure mirrors its settings summary table with Address, Image, Credentials, and Sample
  data rows. Edit buttons reveal the port and image tag; the credentials switch reveals
  username and password fields; the sample-data switch acts inline. The whole-number host
  port must be **1024-65535**, and custom credentials require both fields. Invalid input
  blocks starting. Back and Cancel preserve configuration.
- **Simulation:** five stages advance every 900 ms: Docker readiness, database image,
  container creation, database startup, and connection readiness. Completion switches to
  the separate Done step with completed stages, an All set message, next steps, settings,
  and an example endpoint. No Docker inspection, downloads, network requests, file writes,
  containers, or connections occur. Navigation locks during progress and completion.
  Cancel clears the timer and progress; **Start over** restores Introduction and defaults.
  Unmounting also clears the pending timer.
- **StatusList:** the first section in **Status**, with its own **Preview config**,
  documentation link, and dashed preview. Complete, Fail, Retry, and Reset affect
  only [StatusList][status], not StepList. Failure blocks advancement until retry.
  Reset restores done/active/warning/pending states; no remote pipeline runs.
- **StepList:** the second **Status** section is independent. Its only preview control is
  **Next step**, which advances through the ordered stages and disables at the end, plus an
  **Enable step selection** switch that makes the current and completed earlier steps selectable.
  Future steps stay disabled. Stages before the current one are marked complete. Selected and
  completed-step dropdowns are intentionally omitted.
- **Service metrics:** within **Metrics & badges**, its own **Preview config** changes
  Filled/Subtle, Small/Large, and Mixed/Ready/Loading/Unavailable. `undefined` means
  loading, `null` means unavailable, and `0` is a real measurement. A `Divider` precedes
  its dashed **Component preview** containing only [MetricGrid and MetricCard][metrics].
- **Badges:** a separate region in the same tab, with its own **Preview config**,
  **Keyboard focus** toggle, `Divider`, and dashed **Component preview**. Toggle whether
  Production enters the tab order; focus reveals its descriptive tooltip. Read only
  always opts out with `focusable={false}`. All starter-kit badges use `shape="rounded"`,
  including Main View examples. See [FocusableBadge][badge].

Hidden showcase tabs stay mounted and retain local session state; reloads reset it.
The wizard owns an independent panel session, not embedded tab state. Each newly
opened wizard starts at Intro with defaults; closing and reopening or reloading resets it.

## Imports and Theme Setup

Use only `.`, `/components`, and `/monaco`, never package `src`, `dist`, or CSS paths.
The [bootstrap](../src/webviews/index.tsx) already wraps views in `VSCodeFluentProvider`;
a standalone consumer can start with:

```tsx
import { VSCodeFluentProvider } from '@microsoft/vscode-ext-webview-fluentui';
import { MetricCard, MetricGrid } from '@microsoft/vscode-ext-webview-fluentui/components';
import * as l10n from '@vscode/l10n';
import { type JSX } from 'react';

export function MetricsView(): JSX.Element {
  return (
    <VSCodeFluentProvider>
      <MetricGrid>
        <MetricCard label={l10n.t('Failed requests')} value={0} />
        <MetricCard label={l10n.t('Response time')} value={undefined} loadingPlaceholder="skeleton" aria-busy />
        <MetricCard label={l10n.t('Cache hit rate')} value={null} nullValuePlaceholder={l10n.t('Unavailable')} />
      </MetricGrid>
    </VSCodeFluentProvider>
  );
}
```

Initialize `l10n` before rendering, as the bootstrap does. The package supplies English
defaults, not translations: localize labels, status words, tooltips, placeholders,
and accessible navigation/overflow labels. Format measurements in the consumer with `Intl`.

Importing the root injects the adaptive stylesheet **once per document**, with
document-global Fluent overrides that also reach portals. `/components` and
`/monaco` do not inject that stylesheet. Components read Fluent tokens and can use
any Fluent UI v9 `FluentProvider`; the adaptive provider is optional for them.
Griffel and the root stylesheet require a CSP allowing `style-src 'unsafe-inline'`.
Keep script restrictions separate; see the [upstream README][package].

In 1.1.0, high-contrast modes use static Fluent fallbacks; high-contrast light uses
the standard light fallback rather than fully mapping the host's custom colors.
These implementation notes do not certify browser geometry or high-contrast compliance.

## Wizard Sizing and State

`Wizard` is controlled: the consumer owns advancement, validation, labels, and disabled
rules. Use **direct `WizardStep` children**, not fragments or custom wrappers. Only
the active step mounts; keep values in the parent, as [ShowcaseWizard.tsx](../src/webviews/demo/componentShowcase/ShowcaseWizard.tsx) does.

Its root is a `Container` with a default height of **`100vh`**. In 1.1.0, `Wizard`
does not expose root `className` or `style`. The local wizard now fills its own webview,
with a viewport-height root in [showcaseWizard.scss](../src/webviews/demo/componentShowcase/showcaseWizard.scss),
not a bounded embedded wrapper or forced constrained height. Let the wizard body scroll.
The [command](../src/commands/openShowcaseWizard.ts) opens this separate panel through
the [controller](../src/webviews/demo/componentShowcase/componentShowcaseController.ts).
See the [Wizard guide][wizard] for upstream composition and sizing constraints.
The wizard owns a `main` landmark and focuses the step heading on step changes;
avoid nested `main` landmarks. Compose `Container` and `StepList` for different layouts.

On completion, the root's `data-state` and `activeStep` both become `done`; the dedicated
Done page renders the completed status list and receipt. `reserveDetailSpace` reserves row
detail space. The footer layers button captions in shared grid cells to reserve label
geometry across state changes. **Learn more** uses `ContainerFooter.contentEnd` and calls
the shared `common.displayInformationMessage` tRPC procedure to open a VS Code modal.

## Accessibility and Monaco Boundaries

`StepList` is controlled and needs a parent with `min-width: 0` for overflow.
Localize `ariaLabel` and `overflowAriaLabel`. Its `vertical` prop is reserved:
**vertical rendering is not implemented in 1.1.0**.

With the installed Fluent dependencies, `StepOverflowMenu` can throw React's
"Maximum update depth exceeded" near an overflow boundary (reproduced at a 960px
CSS viewport). The same failure occurs in the unchanged `a2cdde7` baseline;
it is not introduced by separating the previews. No package workaround is applied.

`StatusList` accepts localized `statusLabels` for `pending`, `active`, `done`,
`error`, and `warning`; omitted entries retain English defaults. It deliberately
has **no implicit live announcements**. The demo owns one `role="status"` summary
for the pipeline. `reserveDetailSpace` keeps incoming evidence from shifting rows.
For `FocusableBadge`, visible content supplies the name; use a localized `Tooltip`
with `relationship="description"` for additional details, not an invented button action.

Monaco is a separate theming entry, not a seventeenth showcase component:

```ts
import { useVSCodeMonacoTheme } from '@microsoft/vscode-ext-webview-fluentui/monaco';
```

The [editor wrapper](../src/webviews/components/MonacoEditor.tsx) defines the theme before
mount and reapplies updates for same-kind switches and `workbench.colorCustomizations`.
Try Monaco in the **Main View**. Consumers own its installation, loader/workers,
layout, and focus/escape handling. The package has no Monaco runtime dependency;
default syntax rules use Monaco's palette, not TextMate colors. See the [Monaco guide][monaco].

## Upstream References

The [package README][package], [component guide][catalog], and family links are pinned
to `4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2`, matching published 1.1.0.
[DocumentDB PR #895](https://github.com/microsoft/vscode-documentdb/pull/895) records styling extraction/adoption.
See the [package overview](webview-packages-overview.md) and [starter kit README](../README.md) for context.

[package]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/README.md
[catalog]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/README.md
[container]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/Container/README.md
[wizard]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/Wizard/README.md
[steps]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/StepList/README.md
[status]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/StatusList/README.md
[metrics]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/MetricGrid/README.md
[badge]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/FocusableBadge/README.md
[monaco]: https://github.com/microsoft/vscode-documentdb/blob/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/monaco/README.md
[wizard-image]: https://raw.githubusercontent.com/microsoft/vscode-documentdb/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/Wizard/screenshot.png
[status-image]: https://raw.githubusercontent.com/microsoft/vscode-documentdb/4540d86c7371e8e708fb1c9a1c7f75dc7c2a07c2/packages/vscode-ext-webview-fluentui/src/components/StatusList/screenshot.png
