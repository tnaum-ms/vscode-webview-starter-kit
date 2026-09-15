# React Architecture Guidelines

Current React and rendering patterns for the VS Code Webview Starter Kit.

## Ownership Boundaries

| Concern                                                             | Owner                                    |
| ------------------------------------------------------------------- | ---------------------------------------- |
| React root, view registry, local state, SCSS                        | This repository                          |
| tRPC transport, panel lifecycle, React transport hooks              | `@microsoft/vscode-ext-webview`          |
| Adaptive Fluent theme, shared component families, Monaco theme data | `@microsoft/vscode-ext-webview-fluentui` |
| Monaco runtime, workers, models, layout, editor features            | This repository                          |

Use the public package entries only:

- `@microsoft/vscode-ext-webview-fluentui` for `VSCodeFluentProvider` and theme APIs
- `@microsoft/vscode-ext-webview-fluentui/components` for shared component families
- `@microsoft/vscode-ext-webview-fluentui/monaco` for Monaco theme data

Never import package `src`, `dist`, or CSS paths.

## Rendering Pipeline

All registered views boot through `src/webviews/index.tsx`:

```tsx
root.render(
  <VSCodeFluentProvider>
    <WithWebviewContext vscodeApi={vscodeApi}>
      <Component />
    </WithWebviewContext>
  </VSCodeFluentProvider>,
);
```

The bootstrap configures `@vscode/l10n` before rendering. `WebviewRegistry` maps the host-provided view name to a React component and is the source of the `WebviewName` union.

The styling package root injects adaptive Fluent overrides once per document. `/components` and `/monaco` have no stylesheet side effect. Griffel and the root stylesheet require a webview CSP that permits `style-src 'unsafe-inline'`.

## View Organization

Use the smallest shape the view needs:

```text
viewName/
├── ViewName.tsx
├── viewName.scss
├── viewNameController.ts
├── viewNameRouter.ts
├── components/
├── hooks/
└── types/
```

The controller and router are extension-host code even when colocated with the React component. Use the **webview-trpc-messaging** skill for those files.

## State

Prefer local `useState` and props for state confined to a small tree. Introduce Context when multiple distant descendants share cohesive state or commands.

Use functional updates whenever the next value depends on the previous value:

```tsx
setState((previous) => ({
  ...previous,
  isLoading: true,
}));
```

Keep durable wizard or workflow input in the parent when child steps unmount. Do not duplicate the same source of truth in local state and Context.

### Stale Closures

Use refs only when an external library binds a callback once or when a long-lived callback must read the latest value:

```tsx
const dataRef = useRef(data);

useEffect(() => {
  dataRef.current = data;
}, [data]);
```

Normal React event handlers should use ordinary closures and correct dependencies. Do not add `useCallback` or refs by default.

## Effects and Cleanup

Effects that acquire resources must release them. This includes event listeners, subscriptions, timers, Monaco disposables, and `AbortController` instances.

```tsx
useEffect(() => {
  const timer = window.setTimeout(advance, 900);
  return () => window.clearTimeout(timer);
}, [advance]);
```

Avoid hardcoded readiness delays. Use lifecycle callbacks or explicit readiness signals when the dependency provides them.

## Fluent UI

Use standard controls from `@fluentui/react-components`. Wrap each webview root in `VSCodeFluentProvider`; do not recreate the deleted local theme provider or color-space utilities.

Load **webview-fluentui-components** when using `Container`, `Wizard`, `StepList`, `StatusList`, `MetricGrid`, or `FocusableBadge`. That skill owns the component-specific state and accessibility contracts.

Localize all visible text and accessible labels with `l10n.t()`. Package English strings are fallbacks, not translations supplied by the consumer.

## Monaco

`src/webviews/components/MonacoEditor.tsx` wraps `@monaco-editor/react` and imports theme data from the package's `/monaco` entry:

```tsx
const monacoTheme = useVSCodeMonacoTheme({ themeName: 'adaptive' });
```

The wrapper defines the theme in `beforeMount` for correct first paint, then defines and applies new snapshots in a layout effect. Updates include:

- light/dark/high-contrast changes
- switches between themes of the same kind
- `workbench.colorCustomizations` changes

The package does not depend on the Monaco runtime. Consumers own installation, loader/workers, models, schema registration, editor options, commands, and layout.

The local wrapper also provides:

- Fluent uncontrolled-focus integration for Monaco's Tab behavior
- optional Escape-key exit through `onEscapeEditor`
- a localized screen-reader announcement for the Escape instruction
- cleanup of focus and blur listeners

Call `editor.layout()` after a containing panel or grid changes size when Monaco cannot detect the new dimensions. Do not recreate the editor merely because the VS Code theme changed.

## Styling

- Put component layout and presentation in its imported `.scss` file.
- Put shared document rules and token fallbacks in `src/webviews/index.scss`.
- Use stable flex/grid sizing and `min-width: 0` where children may overflow.
- Prefer gaps over compensating negative margins.
- Reserve space when changing labels or status details would otherwise shift controls.
- Honor `prefers-reduced-motion` for transitions.
- Keep inline styles only where an integration API requires element-level values.

## Accessibility

- Use semantic controls from Fluent UI instead of clickable generic elements.
- Give icon-only buttons localized accessible names, commonly through a labeling `Tooltip` plus `aria-label` where needed.
- Do not create nested `main` landmarks.
- Use `Announcer` or a deliberate `role="status"` region for meaningful asynchronous changes; do not announce every visual update.
- Provide a reliable keyboard path out of embedded Monaco editors.
- Test focus order, disabled states, overflow, and reduced-motion behavior.

## Error and Loading States

Use `try`/`catch`/`finally` so loading state always resets. Narrow caught values before reading them:

```tsx
setIsLoading(true);
try {
  await operation();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  setErrorMessage(message);
} finally {
  setIsLoading(false);
}
```

Use the common tRPC dialog procedures when an error must be surfaced by the extension host.

## Current Examples

| Pattern                               | Source                                                      |
| ------------------------------------- | ----------------------------------------------------------- |
| Rendering and provider composition    | `src/webviews/index.tsx`                                    |
| Monaco theme and keyboard integration | `src/webviews/components/MonacoEditor.tsx`                  |
| Small local-state view                | `src/webviews/demo/basicView/BasicView.tsx`                 |
| Tabs and composed feature panels      | `src/webviews/demo/mainView/MainView.tsx`                   |
| Shared component catalog              | `src/webviews/demo/componentShowcase/ComponentShowcase.tsx` |
| Controlled steps and statuses         | `src/webviews/demo/componentShowcase/ShowcaseStatus.tsx`    |
| Full-page controlled wizard           | `src/webviews/demo/componentShowcase/ShowcaseWizard.tsx`    |

## Avoid

- local copies of the package theme provider or theme generators
- deep imports into package internals
- `any`
- unlocalized visible or accessible strings
- effects without cleanup
- refs and memoized callbacks without a concrete lifecycle need
- nested interactive controls or invented button semantics for status elements
- assuming a hidden or inactive step remains mounted
