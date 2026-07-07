# VS Code Webview Starter Kit

<p align="center"><img src="./resources/vscode-webview-starter-kit.png" alt="VS Code Webview Starter Kit Screenshot" width="600" style="max-width:100%;height:auto;"></p>

Build rich, interactive VS Code webviews, fast. This starter kit gives you **type-safe RPC messaging**, **React + Fluent UI** with **adaptive theming**, and an embedded **Monaco Editor**, all wired up and ready to go.

This project was extracted from the webview infrastructure powering [DocumentDB for VS Code](https://github.com/microsoft/vscode-documentdb/) Extension and [Azure Cosmos DB](https://github.com/microsoft/vscode-cosmosdb/) Extension. It provides a production-tested foundation for building VS Code webviews with React.

## Table of Contents

- [Features](#features)
- [Try the Demo](#try-the-demo)
- [Getting Started](#getting-started)
- [Project Structure](#project-structure)
- [Development](#development)
- [Debugging](#debugging)
- [Architecture](#architecture)
- [Under the Hood](#under-the-hood)
- [Copilot Skills](#copilot-skills)
- [Adding a New View](#adding-a-new-view)
- [Advanced](#advanced)
- [FAQ](#faq)
- [Limitations](#limitations)
- [Future Work](#future-work)
- [License](#license)

## Features

- **Type-safe RPC** - End-to-end typed communication between extension host and webview via `postMessage` (powered by [tRPC](https://trpc.io/))
- **React + Fluent UI** - Modern UI components with VS Code theme integration
- **Adaptive theming** - Automatic theme adaptation using `DynamicThemeProvider`
- **Monaco Editor** - Embedded code editor component
- **Subscriptions & Abort** - Real-time data streaming and cancellable long-running operations
- **Localization** - Full `@vscode/l10n` integration

## Try the Demo

A pre-built `.vsix` package is available so you can try the extension without cloning or building the project:

1. Go to the [v2.0.0 release page](https://github.com/tnaum-ms/vscode-webview-starter-kit/releases/tag/v2.0.0)
2. Download the `.vsix` file from the **Assets** section
3. In VS Code, open the Command Palette (`Ctrl+Shift+P`) and run:
   > **Extensions: Install from VSIX…**
4. Select the downloaded `.vsix` file
5. Once installed, open the Command Palette and run:
   > **Webview Starter Kit: Open Main View**

To uninstall later, find the extension in the Extensions sidebar and click **Uninstall**.

## Getting Started

```bash
npm install
npm run build
```

Press **F5** to launch the extension in a new VS Code window. The main webview opens automatically on activation.

To reopen it manually (e.g. after closing the panel), use the Command Palette (`Ctrl+Shift+P`):

> **Webview Starter Kit: Open Main View**

## Project Structure

| Folder                       | Purpose                                                                                                                                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                       | Extension host source code                                                                                                                                                                   |
| `src/webviews/`              | React webview components                                                                                                                                                                     |
| `src/webviews/_integration/` | Consumer-owned glue over the [`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview) package (root router, telemetry adapter, panel preset, registry) |
| `src/webviews/theme/`        | Adaptive theming system                                                                                                                                                                      |
| `src/webviews/demo/`         | Demo webview views                                                                                                                                                                           |
| `src/commands/`              | Command handlers                                                                                                                                                                             |
| `l10n/`                      | Localization bundles                                                                                                                                                                         |

> The type-safe RPC transport (tRPC over `postMessage`), the panel facade, and
> the React hooks are provided by the **`@microsoft/vscode-ext-webview`** package.
> If you cloned an earlier version of this kit that carried a local
> `src/webviews/api/` copy, see [migration.md](migration.md) for how to move to
> the package.

## Development

| Command                | Purpose                         |
| ---------------------- | ------------------------------- |
| `npm run build`        | TypeScript compilation          |
| `npm run webpack-dev`  | Webpack development build       |
| `npm run watch:ext`    | Watch extension code            |
| `npm run watch:views`  | Watch webview code (dev server) |
| `npm run lint`         | Run ESLint                      |
| `npm run prettier-fix` | Format code                     |
| `npm run test`         | Run Jest tests                  |
| `npm run l10n`         | Rebuild localization bundles    |

### Activation Events

This starter kit uses a wildcard activation event for demo convenience:

```json
"activationEvents": [
    "*"
]
```

This causes the extension to activate **on every VS Code startup**, which negatively impacts startup performance. It is used here only so that demo commands are immediately available without requiring a specific trigger.

For a production extension, replace `"*"` with scoped activation events (e.g., `onCommand:`, `onView:`, `onLanguage:`) that match your actual usage. See the [Activation Events documentation](https://code.visualstudio.com/api/references/activation-events) for the full list of supported events.

### Hot Reloading

Webview code supports **hot reloading** during development. When you run the `watch:views` task (or the combined `Watch` task), changes to React components, styles, and other webview source files are automatically reflected in the running webview - no need to reload the extension host or reopen the panel.

> **Tip:** Run both watchers together with the **Watch** task for the best experience. Extension host code changes still require a restart (`Ctrl+Shift+F5`).

## Debugging

Press **F5** to launch the extension in a new VS Code window using the **Launch Extension (webpack)** configuration.

### Extension Host

The extension host code (Node.js) can be debugged directly in VS Code using breakpoints. Note that the `STOP_ON_ENTRY` environment variable in `launch.json` can be set to `"true"` to pause execution at the first line of the `activate()` function. This is needed to debug activation code because the environment takes a long time to load, and regular breakpoints in activation code would not be hit otherwise.

### Webviews

Webview code (React/browser) **cannot** be debugged with VS Code breakpoints. Instead, open the Developer Tools in the Extension Host VS Code window (**Help > Toggle Developer Tools**, or `Ctrl+Shift+I`) and use the browser-style debugger there to inspect and debug webview code.

## Architecture

The starter kit demonstrates a clean separation between the VS Code extension host (Node.js) and webview UI (browser):

```
Extension Host (Node.js)           Webview (Browser)
┌──────────────────────┐           ┌───────────────────────┐
│  WebviewController   │◄─────────►│  React + Fluent UI    │
│  tRPC Router         │  postMsg  │  tRPC Client          │
│  Procedures          │           │  DynamicThemeProvider │
└──────────────────────┘           └───────────────────────┘
```

## Under the Hood

This starter kit solves several challenges that arise when running a React application inside a VS Code webview.

### Dual Webpack Builds

The project uses **two separate webpack configurations**: one for the extension host (Node.js, `webpack.config.ext.js`) and one for the webview (browser, `webpack.config.views.js`). This ensures that Node.js-specific code never leaks into the browser bundle, and vice versa.

### tRPC over postMessage

VS Code webviews communicate with the extension host through `window.postMessage`. The [`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview) package wraps that raw messaging channel with tRPC using a custom link adapter (`vscodeLink`), giving you:

- Full TypeScript type inference from router definition to React component
- Automatic serialization and deserialization
- Support for queries, mutations, and subscriptions
- Built-in abort/cancellation support via `AbortSignal`

### Adaptive Theming

`DynamicThemeProvider` reads VS Code's CSS custom properties (e.g., `--vscode-editor-background`) at runtime and generates a matching Fluent UI theme. When the user switches VS Code themes, the webview updates automatically without a reload.

<p align="center"><img src="./resources/vscode-webview-themes-support.gif" alt="Adaptive theming in action — the webview automatically adapts as VS Code themes change" width="600" style="max-width:100%;height:auto;"></p>

### Content Security Policy

The framework's `WebviewController` generates a strict CSP header for each webview panel. Only resources from the extension's own directory and the webview's `cspSource` are allowed, following [VS Code's security best practices](https://code.visualstudio.com/docs/extensions/webview#_security).

## Copilot Skills

This repository ships with **GitHub Copilot skills** — structured knowledge files in `.github/skills/` that teach Copilot the project's architecture and conventions. When Copilot is active in this workspace, it automatically picks up these skills and applies them to your requests.

| Skill                          | File                                                           | What it covers                                                                                                                                                             |
| ------------------------------ | -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **react-webview-architecture** | [SKILL.md](.github/skills/react-webview-architecture/SKILL.md) | React component patterns, Fluent UI integration, state management (Context API), Monaco Editor usage, stale closure fixes, styling conventions                             |
| **webview-trpc-messaging**     | [SKILL.md](.github/skills/webview-trpc-messaging/SKILL.md)     | tRPC router creation, procedure definitions (queries, mutations, subscriptions), WebviewController wiring, WebviewRegistry, telemetry middleware, AbortSignal cancellation |

With these skills in place, you can ask Copilot to create a new webview, add a tRPC procedure, or wire up a controller, and it will follow the same patterns used throughout the codebase — producing code that compiles and integrates correctly on the first try.

## Adding a New View

The Copilot skills described above understand the full process for creating webviews. When you ask GitHub Copilot to create a new webview, the skills guide it through the entire process automatically.

To learn the pattern yourself — or to see exactly what each step touches — the repository history contains a **worked, commit-by-commit tutorial** that builds the demo **Basic View** from nothing. Start from the [baseline commit](https://github.com/tnaum-ms/vscode-webview-starter-kit/commit/4619769cc4e0098bcb38c6e5efc3f0f3740d74ee) (the repo with only the Main View), then read the four step commits below in order. Each is small, self-contained, and compiles and passes tests on its own:

| Step                                | Commit                                                                                                              | What it adds                                                                                                                         | Key files                                                                                                                                                                     |
| ----------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **1. Scaffold**                     | [`af01593`](https://github.com/tnaum-ms/vscode-webview-starter-kit/commit/af0159369f2d54d14c224e858d6763709d9a26cf) | The component, styles, an empty router, and registration so the view can render.                                                     | `demo/basicView/BasicView.tsx`, `basicView.scss`, `basicViewController.ts`, `basicViewRouter.ts`; register in `_integration/WebviewRegistry.ts` + `_integration/appRouter.ts` |
| **2. Command & navigation**         | [`9d8a827`](https://github.com/tnaum-ms/vscode-webview-starter-kit/commit/9d8a8273e02bd834d106418216f4e687a2f3cd8c) | A VS Code command to open the view (palette + `package.json`), plus a link from the Main View that opens it through a tRPC mutation. | `commands/openBasicView.ts`, `extension.ts`, `package.json`, `mainView/mainViewRouter.ts`, `mainView/MainView.tsx`                                                            |
| **3. Client-side interaction**      | [`939a497`](https://github.com/tnaum-ms/vscode-webview-starter-kit/commit/939a497fc219407eb6352a107d82f7ae393ab40a) | A button and a message rendered from local React state (`useState`) — no extension-host round-trip yet.                              | `demo/basicView/BasicView.tsx`, `basicView.scss`                                                                                                                              |
| **4. Extension host communication** | [`328873e`](https://github.com/tnaum-ms/vscode-webview-starter-kit/commit/328873effedaec68572dd9998b3637aa61256a3b) | A `hello` tRPC query on the router, with the button wired to call it and display the result. Adds a router unit test.                | `demo/basicView/basicViewRouter.ts`, `BasicView.tsx`, `_integration/appRouter.test.ts`                                                                                        |

Read in order, the four commits show the whole data path come together: **register → open → local state → typed tRPC call**. The end state of Step 4 is exactly the Basic View that ships in this repository.

### Typical steps

When creating a new webview manually, these are the files and registrations involved (the same ones the tutorial commits above touch):

1. Create a new folder under `src/webviews/demo/yourView/`
2. Add a React component (`YourView.tsx`)
3. Add a tRPC router (`yourViewRouter.ts`)
4. Add a panel factory (`yourViewController.ts`) that calls `openAppWebview`
5. Register the component in `_integration/WebviewRegistry.ts`
6. Wire the router into `_integration/appRouter.ts`
7. Add a command handler (`src/commands/openYourView.ts`) and register it in `extension.ts` and `package.json`

## Advanced

### The tRPC client is a per-webview singleton

`useTrpcClient()` (from `@microsoft/vscode-ext-webview/react`, re-exported
typed via `src/webviews/_integration/useTrpcClient.ts`) returns the client
**directly** and shares a single instance across every component in a webview:

```tsx
export const MyComponent: React.FC = () => {
  const trpcClient = useTrpcClient();
  // ...
};
```

Because the client is shared per webview, there is no provider tree to wire up and no per-component client fan-out to worry about — every component that calls the hook receives the same instance, and cross-cutting observers see every call. (The transport itself registers one `window` `message` listener per in-flight operation and removes it when the call settles, so listeners scale with the number of concurrent calls, not with the number of components.)

For webview-wide observation of query/mutation outcomes (success, error,
aborted), subscribe through `useRpcEvents()` from
`@microsoft/vscode-ext-webview/react` rather than wrapping every call site. To
log every call to the webview devtools console, pass `enableRpcLogging` to
`WithWebviewContext`. See the package's
[README](https://www.npmjs.com/package/@microsoft/vscode-ext-webview) and
ADVANCED.md for the full observability surface.

## FAQ

### Why tRPC instead of raw postMessage?

Raw `postMessage` requires you to define message types manually, match request/response pairs, and handle serialization yourself. tRPC provides end-to-end type safety, so your extension host procedures and webview calls share the same TypeScript types with zero code generation. If you rename a field on the server, the client shows a compile error immediately.

### Can I use a different UI framework instead of Fluent UI?

Yes. The tRPC messaging layer and the webview controller infrastructure are independent of the UI library. You can replace Fluent UI with any React component library. The `DynamicThemeProvider` is Fluent UI-specific, so you would need to adapt the theming approach for your chosen framework.

### How do I persist state when the webview is hidden?

VS Code may dispose of a webview's content when it is moved to a background tab. Use the `retainContextWhenHidden` option in `WebviewController` to keep the webview alive, or store state on the extension host side and re-send it when the webview is re-created.

### Can I have multiple webview panels open at the same time?

Yes. Each call to `WebviewController.createWebviewPanel()` opens an independent panel with its own tRPC server instance. State is not shared between panels unless you explicitly coordinate through the extension host.

### How do I add an npm dependency to the webview?

Install the package normally with `npm install`. If the package is used only in webview code, it will be bundled by the webview webpack config automatically. If it is used only in extension host code, it will be bundled by the extension webpack config. Avoid importing the same package in both contexts unless it is a pure TypeScript types package.

## Limitations

- **No Node.js APIs in webview code.** Webview code runs in a sandboxed browser iframe. You cannot use `fs`, `path`, `child_process`, or other Node.js modules directly. Access platform capabilities through tRPC procedures on the extension host.
- **Webview debugging requires DevTools.** VS Code breakpoints do not work inside webview code. Use the browser Developer Tools (`Ctrl+Shift+I` in the Extension Host window) to inspect and debug.
- **Extension host changes need a restart.** Hot reloading applies only to webview code. Changes to extension host files (routers, controllers, commands) require restarting the Extension Development Host (`Ctrl+Shift+F5`).

## Published npm Package

This starter kit's core webview infrastructure — the tRPC messaging layer, the
webview controller / panel facade, and the React hooks — now ships as a
standalone npm package:
[`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview).
This repository is the canonical **all-in** (React + tRPC + webview) reference
consumer of that package. Teams can adopt the patterns by installing the package
rather than forking or copying the source.

If you cloned an earlier version of this kit that carried a local
`src/webviews/api/` copy of the transport, see [migration.md](migration.md) for a
step-by-step guide to moving onto the package.

The adaptive theming system (`DynamicThemeProvider`) is intentionally **not**
part of the package — theming and other UX policy stay consumer-owned. It
remains in this repository under `src/webviews/theme/`.

## Contributors

This starter kit and the `@microsoft/vscode-ext-webview` package it builds on were a team effort:

- [**tnaum-ms**](https://github.com/tnaum-ms) assembled the starter kit, built the tRPC integration, built and shaped the [`@microsoft/vscode-ext-webview`](https://www.npmjs.com/package/@microsoft/vscode-ext-webview) npm package, and now uses it in the [DocumentDB for VS Code](https://github.com/microsoft/vscode-documentdb) extension.
- [**bk201-**](https://github.com/bk201-) built the dynamic theming system and, with sevoku, test-drove the package in the [Azure Cosmos DB for VS Code](https://github.com/microsoft/vscode-cosmosdb) extension, helping show the path toward a more modular design.
- [**guanzhousongmicrosoft**](https://github.com/guanzhousongmicrosoft) built the npm release pipelines that publish the package.
- [**sevoku**](https://github.com/sevoku) helped test-drive the package in [Azure Cosmos DB for VS Code](https://github.com/microsoft/vscode-cosmosdb) with bk201-, surfacing the modular direction.

Thanks to everyone who contributed ideas, reviews, and feedback along the way.

## License

See [LICENSE.md](LICENSE.md).
