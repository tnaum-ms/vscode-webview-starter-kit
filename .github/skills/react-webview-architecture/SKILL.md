---
name: react-webview-architecture
description: Architecture patterns for React-based webviews in the VS Code Webview Starter Kit. Use when creating or debugging webview roots, choosing local state or Context, integrating Monaco Editor, applying VSCodeFluentProvider, handling webview styling, or solving stale closures. Does not cover tRPC messaging or the shared Fluent component families.
---

# React Webview Architecture

Patterns and conventions for React webviews in the VS Code Webview Starter Kit.

**Related skills** (do not duplicate):

- **webview-trpc-messaging** — tRPC routers, procedures, telemetry, AbortSignal, subscriptions, WebviewController
- **webview-fluentui-components** — Container, Wizard, StepList, StatusList, MetricGrid, FocusableBadge, and their accessibility contracts

**Full reference**: See [references/REACT_ARCHITECTURE_GUIDELINES.md](./references/REACT_ARCHITECTURE_GUIDELINES.md)

## When to Use

- Creating or modifying a webview
- Adding new components inside `src/webviews/`
- Working with React Context state management
- Integrating Monaco Editor
- Applying adaptive Fluent UI theming
- Debugging stale closure issues in event handlers

## Rendering Pipeline

Every webview boots through `src/webviews/index.tsx`:

```tsx
root.render(
  <VSCodeFluentProvider>
    <WithWebviewContext vscodeApi={vscodeApi}>
      <Component />
    </WithWebviewContext>
  </VSCodeFluentProvider>,
);
```

- **`VSCodeFluentProvider`** — adapts Fluent UI theming to VS Code's active color theme (from `@microsoft/vscode-ext-webview-fluentui`)
- **`WithWebviewContext`** — provides `vscodeApi` (postMessage) via React Context (from `@microsoft/vscode-ext-webview/react`)
- **`WebviewRegistry`** — maps webview names → React components (in `src/webviews/_integration/WebviewRegistry.ts`)

Configuration from the extension host is read via `useConfiguration<T>()` (from `@microsoft/vscode-ext-webview/react`).

Import `VSCodeFluentProvider` from the package root. That root import injects the adaptive stylesheet once per document. The package's `/components` and `/monaco` entries do not inject it. Runtime Griffel styles and the adaptive stylesheet require `style-src 'unsafe-inline'` in the webview CSP.

## File Organization

```
viewName/
├── ViewName.tsx            # Main component
├── viewName.scss           # Styles
├── viewNameContext.ts      # Context + state types (if complex)
├── viewNameController.ts   # Panel factory over openAppWebview (extension-side)
├── viewNameRouter.ts       # tRPC router (extension-side, see webview-trpc-messaging skill)
├── constants.ts
├── components/             # Sub-components
├── hooks/                  # Custom React hooks
├── types/                  # TypeScript types
└── utils/                  # Helpers
```

## Component Hierarchy

Example component hierarchy for a typical view:

```
MyView
├── Header
├── ToolbarActions
├── TabList
│   ├── ContentTab
│   │   └── ContentPanel
│   └── EditorTab
│       └── MonacoEditor
└── StatusBar
```

## State Management

### Simple views: local `useState` + props

### Complex views: React Context with `[state, setState]` tuple

```tsx
export const MyViewContext = createContext<
    [MyViewContextType, React.Dispatch<React.SetStateAction<MyViewContextType>>]
>([DefaultMyViewContext, () => {}]);

// Provider in parent
const [currentContext, setCurrentContext] = useState(DefaultMyViewContext);
<MyViewContext.Provider value={[currentContext, setCurrentContext]}>

// Consumer in child
const [currentContext, setCurrentContext] = useContext(MyViewContext);
```

**Always use functional updates** when state depends on previous value:

```tsx
setCurrentContext((prev) => ({
  ...prev,
  isLoading: true,
  activeQuery: { ...prev.activeQuery, pageNumber: 1 },
}));
```

## Stale Closure Pattern (CRITICAL)

Third-party components that bind event handlers at initialization don't update when state changes. **Always use refs** to access current data in those handlers:

```tsx
const dataRef = useRef(data);
useEffect(() => {
  dataRef.current = data;
}, [data]);

const onClick = useCallback((event) => {
  const item = dataRef.current[event.detail.args.row]; // ✅ always current
  // NOT: data[event.detail.args.row]; ❌ stale closure
}, []); // stable deps only
```

**Why**: Some third-party components bind handlers once at init time. Without refs, handlers see the data from initialization, not the latest state.

## Monaco Editor

Use the repository's `MonacoEditor` wrapper. It keeps the Monaco runtime consumer-owned while deriving live theme data from the styling package:

```tsx
import { useVSCodeMonacoTheme } from '@microsoft/vscode-ext-webview-fluentui/monaco';

const monacoTheme = useVSCodeMonacoTheme({ themeName: 'adaptive' });
```

The wrapper:

- defines the theme before editor creation to avoid an incorrect first paint
- reapplies theme data for same-kind theme switches and `workbench.colorCustomizations` changes
- integrates Monaco with Fluent's uncontrolled focus handling
- supports Escape-key exit and announces the keyboard instruction
- disposes its registered focus listeners on remount and unmount

Consumers still own the `monaco-editor` installation, loader/workers, editor options, layout, models, schemas, and feature-specific commands. Call `editor.layout()` when the containing layout changes and Monaco cannot measure itself. Do not copy the deleted local theme generators or import package source, `dist`, or CSS paths.

## Fluent UI Integration

Use standard controls from `@fluentui/react-components` v9, themed via `VSCodeFluentProvider`:

| Component                  | Usage                     |
| -------------------------- | ------------------------- |
| `ProgressBar`              | Loading states            |
| `Button`, `ToggleButton`   | Toolbar actions           |
| `Tab`, `TabList`           | View switching            |
| `Dropdown`, `Option`       | Selection (ViewSwitcher)  |
| `Badge`                    | Status/preview indicators |
| `MessageBar`               | Info/warning messages     |
| `Skeleton`, `SkeletonItem` | Loading placeholders      |

For the six reusable component families exported by `@microsoft/vscode-ext-webview-fluentui/components`, load the **webview-fluentui-components** skill.

## Styling

- Each component gets its own `.scss` file, imported directly
- Shared document-level styles and VS Code token fallbacks live in `src/webviews/index.scss`
- Prefer classes in SCSS for layout and presentation
- Keep intentional library-integration styles inline when an API requires element props, as in the Monaco focus bumper
- Prefer flexbox or grid gaps over negative margins
- Respect `prefers-reduced-motion` for custom transitions

```scss
.myView {
  display: flex;
  flex-direction: column;
  height: 100vh;
  min-width: 0;
  row-gap: 12px;
}
```

## Custom Hooks

| Hook                                  | Location              | Purpose                                                                                      |
| ------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `useSelectiveContextMenuPrevention()` | `src/webviews/utils/` | Prevents browser context menu everywhere except Monaco editors. Call once in top-level view. |

## Loading State

```tsx
const [isLoading, setIsLoading] = useState(false);
setIsLoading(true);
try {
  await op();
} finally {
  setIsLoading(false);
}

// In render:
{
  isLoading && <ProgressBar thickness="large" shape="square" className="progressBar" />;
}
```

## Shared Components

| Component      | Location                   | Purpose                                                            |
| -------------- | -------------------------- | ------------------------------------------------------------------ |
| `MonacoEditor` | `src/webviews/components/` | Monaco Editor wrapper with accessibility (focus trap, `Announcer`) |
| `Announcer`    | `src/webviews/components/` | Declarative screen reader announcements via ARIA live regions      |

`FocusableBadge` is not local. Import it from `@microsoft/vscode-ext-webview-fluentui/components`; see **webview-fluentui-components**.

## Common Pitfalls

1. **Forgetting refs with third-party components** → stale data in event handlers
2. **Not cleaning up** event listeners, subscriptions, timers, disposables, and AbortControllers
3. **Not calling `editor.layout()`** after resize → blank Monaco panels
4. **Using `any`** → use proper types or `unknown` with type guards
5. **Missing `l10n.t()`** on user-facing strings
6. **Deep-importing package internals** instead of `.`, `/components`, or `/monaco`
7. **Recreating local theme mapping** instead of using `VSCodeFluentProvider` and `useVSCodeMonacoTheme`
