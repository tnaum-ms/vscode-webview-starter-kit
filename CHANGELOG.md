# Changelog

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
