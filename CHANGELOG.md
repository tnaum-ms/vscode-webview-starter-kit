# Changelog

## 2.1.0

- **Updated `@microsoft/vscode-ext-webview` to 0.10.0** — telemetry now uses the generic `TelemetryRunner<TEnrichment>` contract and curried `telemetryMiddlewareBody`, with timing and outcome classification owned by the consumer runner.
- **Refreshed the integration guidance** — documentation, Copilot instructions, skills, and source comments describe the current 0.10.0 API and its consumer-owned context enrichment model.
- **Rebuilt the Basic View tutorial** — the baseline and four focused tutorial commits now demonstrate view creation on the 0.10.0 integration.

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
