# GitHub Copilot Instructions for vscode-webview-starter-kit

VS Code Webview Starter Kit — a reference app demonstrating tRPC, React, Fluent UI, and adaptive theming in VS Code webviews. TypeScript (strict mode), Jest testing.

## Critical Build Commands

| Command                | Purpose                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `npm run build`        | **Build the project** (use this, NOT `npm run compile`)      |
| `npm run lint`         | Check for linting errors                                     |
| `npm run prettier-fix` | Format code                                                  |
| `npm run l10n`         | Update localization files after changing user-facing strings |

> ⚠️ **NEVER use `npm run compile`** - always use `npm run build` to build the project.

## PR Completion Checklist

Before finishing work on a PR, agents **must** run the following steps in order:

1. **Localization** — If any user-facing strings were added, modified, or removed, run:
   ```bash
   npm run l10n
   ```
2. **Formatting** — Run Prettier to ensure all files meet formatting standards:
   ```bash
   npm run prettier-fix
   ```
3. **Linting** — Run ESLint to confirm there are no linting errors:
   ```bash
   npm run lint
   ```

> ⚠️ **An agent must not finish or terminate until all three steps above have been run and pass successfully.** Skipping these steps leads to CI failures.

## Project Structure

| Folder                       | Purpose                                                                                                                                                 |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/`                       | Main extension source code                                                                                                                              |
| `src/webviews/`              | React webview components                                                                                                                                |
| `src/webviews/_integration/` | Consumer-owned glue over `@microsoft/vscode-ext-webview`: `appRouter`, `trpc` (telemetry adapter), `openAppWebview`, `useTrpcClient`, `WebviewRegistry` |
| `src/webviews/components/`   | Shared components (`MonacoEditor`, `Announcer`)                                                                                                         |
| `src/webviews/theme/`        | Adaptive theming (`DynamicThemeProvider`)                                                                                                               |
| `src/commands/`              | Command handlers                                                                                                                                        |
| `src/utils/`                 | Shared utility functions                                                                                                                                |
| `l10n/`                      | Localization files                                                                                                                                      |

> The tRPC transport, panel facade (`WebviewController` / `openWebview`), and
> React hooks (`useTrpcClient`, `useConfiguration`, `WithWebviewContext`) come
> from the **`@microsoft/vscode-ext-webview`** package, imported via its `.`,
> `/host`, `/webview`, and `/react` entry points. See [migration.md](../migration.md).

## TypeScript Guidelines

- **Never use `any`** - use `unknown` with type guards
- **Prefer `interface`** for object shapes, `type` for unions
- **Always specify return types** for functions
- **Use `vscode.l10n.t()`** for all user-facing strings

```typescript
// ✅ Good - Interface with explicit types
interface ViewConfig {
  readonly title: string;
  readonly showToolbar: boolean;
}

// ✅ Good - Named function with return type
export function createView(config: ViewConfig): Promise<void> {
  // implementation
}

// ✅ Good - Localized user-facing string with safe error handling
try {
  await operation();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  void vscode.window.showErrorMessage(vscode.l10n.t('Operation failed: {0}', errorMessage));
}
```

## Null Safety

Use `nonNullProp()`, `nonNullValue()`, `nonNullOrEmptyValue()` from `src/utils/nonNull.ts`:

```typescript
// ✅ Good - Use nonNull helpers for internal validation
const value = nonNullProp(config, 'title', 'config.title', 'MyStep.ts');

// ✅ Good - Manual check for user-facing validation with l10n
if (!userInput.name) {
  void vscode.window.showErrorMessage(vscode.l10n.t('Name is required'));
  return;
}
```

## Error Handling

Always check `instanceof Error` before accessing `.message`:

```typescript
// ✅ Good - Type-safe error message extraction
try {
  await someOperation();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  void vscode.window.showErrorMessage(vscode.l10n.t('Operation failed: {0}', errorMessage));
}

// ❌ Bad - Direct access to error.message (eslint error)
catch (error) {
  void vscode.window.showErrorMessage(vscode.l10n.t('Failed: {0}', error.message)); // Unsafe!
}
```

## Security

- Never log passwords, tokens, or connection strings
- Use VS Code's secure storage for credentials
- Validate all user inputs

## Additional Patterns

For detailed patterns, see:

- [instructions/typescript.instructions.md](instructions/typescript.instructions.md) - TypeScript patterns and anti-patterns
