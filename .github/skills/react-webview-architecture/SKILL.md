---
name: react-webview-architecture
description: Architecture patterns for React-based webviews in the VS Code Webview Starter Kit. Use when creating new webview components, working with state management (Context API), integrating Fluent UI components, handling Monaco Editor, solving stale closure bugs with refs, or debugging webview rendering issues. Does NOT cover tRPC messaging (see webview-trpc-messaging skill).
---

# React Webview Architecture

Patterns and conventions for React webviews in the VS Code Webview Starter Kit.

**Related skills** (do not duplicate):

- **webview-trpc-messaging** — tRPC routers, procedures, telemetry, AbortSignal, subscriptions, WebviewController

**Full reference**: See [references/REACT_ARCHITECTURE_GUIDELINES.md](./references/REACT_ARCHITECTURE_GUIDELINES.md)

## When to Use

- Creating or modifying a webview
- Adding new components inside `src/webviews/`
- Working with React Context state management
- Integrating Monaco Editor
- Debugging stale closure issues in event handlers

## Rendering Pipeline

Every webview boots through `src/webviews/index.tsx`:

```tsx
root.render(
  <DynamicThemeProvider useAdaptive={true}>
    <WithWebviewContext vscodeApi={vscodeApi}>
      <Component />
    </WithWebviewContext>
  </DynamicThemeProvider>,
);
```

- **`DynamicThemeProvider`** — adapts Fluent UI theming to VS Code's active color theme
- **`WithWebviewContext`** — provides `vscodeApi` (postMessage) via React Context (from `@microsoft/vscode-ext-webview/react`)
- **`WebviewRegistry`** — maps webview names → React components (in `src/webviews/_integration/WebviewRegistry.ts`)

Configuration from the extension host is read via `useConfiguration<T>()` (from `@microsoft/vscode-ext-webview/react`).

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

### Required patterns:

1. **Manual layout** — Monaco doesn't auto-resize:

```tsx
useEffect(() => {
  const handler = debounce(() => editorRef.current?.layout(), 200);
  window.addEventListener('resize', handler);
  handleResize(); // initial layout
  return () => window.removeEventListener('resize', handler);
}, []);
```

2. **Dispose on unmount**:

```tsx
return () => {
  editorRef.current?.dispose();
};
```

3. **MonacoAutoHeight** — self-sizing editor for query fields:

```tsx
<MonacoAutoHeight
  adaptiveHeight={{ enabled: true, maxLines: 10, minLines: 1, lineHeight: 19 }}
  onExecuteRequest={() => onExecuteRequest()}
  onMount={(editor, monaco) => handleEditorDidMount(editor, monaco)}
/>
```

4. **JSON Schema delay** — Monaco's JSON worker may not be ready immediately after mount. An AbortController-guarded delay is used (see QueryEditor for the pattern).

## Fluent UI Integration

Use `@fluentui/react-components` (v9), themed via `DynamicThemeProvider`:

| Component                  | Usage                     |
| -------------------------- | ------------------------- |
| `ProgressBar`              | Loading states            |
| `Button`, `ToggleButton`   | Toolbar actions           |
| `Tab`, `TabList`           | View switching            |
| `Dropdown`, `Option`       | Selection (ViewSwitcher)  |
| `Badge`                    | Status/preview indicators |
| `MessageBar`               | Info/warning messages     |
| `Skeleton`, `SkeletonItem` | Loading placeholders      |

Animations: `Collapse` from `@fluentui/react-motion-components-preview`

## Styling

- Each component gets its own `.scss` file, imported directly
- Shared styles in `sharedStyles.scss`, applied via `@extend`
- **Consistent spacing unit: `10px`** with flexbox `row-gap`/`column-gap`
- **No inline styles** — move to SCSS files
- Avoid negative margins — fix layout with proper flexbox

```scss
.myView {
  display: flex;
  flex-direction: column;
  height: 100vh;
  row-gap: 10px;
}
```

## Custom Hooks

| Hook                                  | Location              | Purpose                                                                                      |
| ------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------- |
| `useSelectiveContextMenuPrevention()` | `src/webviews/utils/` | Prevents browser context menu everywhere except Monaco editors. Call once in top-level view. |

## Conditional Rendering Patterns

**Object-based switch:**

```tsx
{{
    'Table View': <DataViewPanelTable {...props} />,
    'Tree View': <DataViewPanelTree {...props} />,
    'JSON View': <DataViewPanelJSON {...props} />,
}[currentContext.currentView]}
```

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

| Component        | Location                                  | Purpose                                                            |
| ---------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| `MonacoEditor`   | `src/webviews/components/`                | Monaco Editor wrapper with accessibility (focus trap, `Announcer`) |
| `Announcer`      | `src/webviews/components/`                | Declarative screen reader announcements via ARIA live regions      |
| `focusableBadge` | `src/webviews/components/focusableBadge/` | Styles for keyboard-focusable Badge components                     |

## Common Pitfalls

1. **Forgetting refs with third-party components** → stale data in event handlers
2. **Not cleaning up** event listeners, Monaco instances, AbortControllers in `useEffect` return
3. **Not calling `editor.layout()`** after resize → blank Monaco panels
4. **Using `any`** → use proper types or `unknown` with type guards
5. **Missing `l10n.t()`** on user-facing strings
6. **Inline styles** instead of SCSS files
7. **Negative margins** to fix spacing — restructure layout with flexbox gap instead
