# Changelog

## 2.2.0

### Component showcase

- **Added a dedicated Component Showcase** for all six component families and 16 named exports from `@microsoft/vscode-ext-webview-fluentui/components`: Container, Wizard, StepList, StatusList, MetricGrid and FocusableBadge. Interactive previews cover layout, navigation, status flows, metric states and keyboard-accessible badges.
- **Added a full-page Wizard demo** with editable setup options, validation, a five-stage simulated provisioning flow, cancellation and restart behavior. The simulation performs no downloads, container operations, network requests or file writes.
- **Added launch points throughout the starter kit**: a new Main View tab, separate Component Showcase and Wizard panels, Command Palette entries and a standalone browser preview for local UI development.

### Fluent UI integration

- **Adopted [`@microsoft/vscode-ext-webview-fluentui`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview-fluentui) 1.1.0** as the shared source for adaptive Fluent UI theming, reusable components and Monaco theme data.
- **Replaced `DynamicThemeProvider` with `VSCodeFluentProvider`**. Adaptive variable synchronization and component-scoped Fluent overrides now ship with the package, and the former `useAdaptive` opt-out has been removed.
- **Updated `MonacoEditor` to use packaged VS Code theme data** while keeping the Monaco runtime consumer-owned. Theme updates now cover same-kind theme switches and `workbench.colorCustomizations` changes without adding a `monaco-editor` package dependency.
- **Removed the local `src/webviews/theme/` implementation**, including the copied provider, theme context, generators and color-space utilities.
- **Updated Fluent UI to `~9.74`** to match the styling package's supported peer range. Opaque skeletons now use opaque package stencils; use `appearance="translucent"` when an alpha overlay is desired.

### Core package, documentation and tests

- Updated `@microsoft/vscode-ext-webview` to 0.10.1. This package update adds its migration guide to the published tarball without changing runtime or type APIs.
- Added guides for the two-package architecture and the Component Showcase, and refreshed the README and repository guidance for the current integration.
- Updated the Copilot skills for the 2.2.0 architecture: refreshed the React and tRPC panel-launch guidance, and added a dedicated `webview-fluentui-components` skill covering all six shared component families and their accessibility contracts.
- Added coverage for the showcase, wizard, status workflows and Monaco theme integration, and updated router tests for the new panels.

## 2.1.0

### `@microsoft/vscode-ext-webview` 0.10.0

- **Updated the webview API dependency to 0.10.0** — the starter kit now uses `@microsoft/vscode-ext-webview` `~0.10.0` as its supported integration baseline.
- **Adopted generic telemetry context enrichment** — `TelemetryRunner<TEnrichment>` now contributes a consumer-defined object to procedure context, while the starter kit's `WithTelemetry<T>` alias exposes its plain telemetry bag only to instrumented procedures.
- **Adopted the curried telemetry middleware** — `telemetryMiddlewareBody(runner, options)` is wired directly to `publicProcedure.use()`, with event IDs built from the starter kit's telemetry namespace.
- **Moved telemetry policy into the runner** — the consumer runner now owns duration measurement and success, failure, and cancellation classification; the package middleware resolves the event ID, merges context enrichment, and returns the procedure result unchanged.
- **Aligned with the current public API** — documentation no longer relies on the removed package-level `WithTelemetry` helper and covers the 0.10.0 `mergeRouters` and `AnyRouter` exports.
- **Refreshed all integration guidance** — the README, adoption guide, Copilot instructions, skills, and source comments now describe only the current 0.10.0 architecture.
- **Rebuilt the Basic View tutorial** — a new baseline and four focused commits demonstrate scaffolding, navigation, local interaction, and typed extension-host communication on the 0.10.0 integration.

## 2.0.0

- **Adopted the [`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview) package** — the tRPC transport, panel facade, and React hooks that previously lived in a local `src/webviews/api/` copy are now consumed from the published npm package. This repository is the canonical **all-in** (React + tRPC + webview) reference consumer.
- **New `src/webviews/_integration/` layer** — consumer-owned glue over the package: root `appRouter`, the `trpc` telemetry adapter, the `openAppWebview` panel preset, the `useTrpcClient` wrapper, and the `WebviewRegistry`.
- **Panels open via `openAppWebview`** — construction-only views use the factory over the package's `openWebview` instead of `WebviewController` subclasses.
- **Client-first `useTrpcClient`** — the hook now returns the tRPC client directly (`const trpcClient = useTrpcClient()`); `WithWebviewContext`/`useConfiguration` come from `@microsoft/vscode-ext-webview/react`.
- **Removed** the local `src/webviews/api/` folder and `WebviewContext.tsx` (now provided by the package).
- **Docs** — added [migration.md](migration.md) for moving from the local copy to the package, refreshed the README and Copilot skills, and rebuilt the "Add a New View" tutorial as commit-by-commit steps.

## 1.0.0

- Initial release of VS Code Webview Starter Kit
- **Type-safe RPC** — End-to-end typed communication between extension host and webview via `postMessage` (powered by [tRPC](https://trpc.io/))
- **React + Fluent UI** — Modern UI components with VS Code theme integration
- **Adaptive theming** — Automatic theme adaptation using `DynamicThemeProvider`
- **Monaco Editor** — Embedded code editor component
- **Subscriptions & Abort** — Real-time data streaming and cancellable long-running operations
- **Localization** — Full `@vscode/l10n` integration
