---
description: 'TypeScript coding patterns and anti-patterns for VS Code extension development'
applyTo: '**/*.ts,**/*.tsx'
---

# TypeScript Guidelines

## Strict TypeScript Practices

- **Never use `any`** - Use `unknown` with type guards, or create specific interfaces
- **Prefer `interface`** for object shapes and extensible contracts
- **Use `type`** for unions, primitives, and computed types
- **Always specify return types** for functions, especially public APIs
- **Use generic constraints** with `extends` for type safety
- **Prefer `const assertions`** for literal types: `as const`

## Type Patterns

```typescript
// ✅ Good - Interface for object shapes
interface ViewConfig {
  readonly title: string;
  readonly showToolbar?: boolean;
}

// ✅ Good - Enums for well-defined sets
enum ViewStatus {
  Loading = 'loading',
  Ready = 'ready',
  Error = 'error',
}

// ✅ Good - Type for unions and computed types
type EventMap = Record<string, (...args: unknown[]) => void>;
type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

// ✅ Good - Generic with constraints
function createService<T extends BaseService>(ServiceClass: new () => T): T {
  return new ServiceClass();
}
```

## Error Handling

```typescript
// ✅ Good - Custom error classes
export class WebviewStarterError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error,
  ) {
    super(message);
    this.name = 'WebviewStarterError';
  }
}

// ✅ Good - Type-safe error message extraction
try {
  await someOperation();
} catch (error) {
  const errorMessage = error instanceof Error ? error.message : String(error);
  void vscode.window.showErrorMessage(vscode.l10n.t('Failed: {0}', errorMessage));
}

// ✅ Good - In promise catch handlers
void task.start().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  void vscode.window.showErrorMessage(vscode.l10n.t('Failed: {0}', errorMessage));
});

// ❌ Bad - Direct access to error.message (eslint error)
catch (error) {
  void vscode.window.showErrorMessage(vscode.l10n.t('Failed: {0}', error.message)); // Unsafe!
}
```

## VS Code Extension Patterns

```typescript
// ✅ Good - Command registration with error handling
export function registerCommands(context: vscode.ExtensionContext): void {
  const disposables = [
    vscode.commands.registerCommand('webviewStarter.openMyView', async () => {
      try {
        await handleOpenMyView();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        void vscode.window.showErrorMessage(vscode.l10n.t('Failed to open view: {0}', errorMessage));
      }
    }),
  ];
  context.subscriptions.push(...disposables);
}
```

## Import Organization

```typescript
// ✅ Good - Group imports by type
import * as path from 'path'; // Node.js built-ins
import * as vscode from 'vscode'; // Third-party

import { ConnectionManager } from '../services/ConnectionManager'; // Local
import { AppError } from '../utils/errors';

import type { ConnectionConfig, DatabaseInfo } from './types'; // Type imports last
```

## Anti-Patterns

| ❌ Avoid                    | ✅ Instead                       |
| --------------------------- | -------------------------------- |
| `any` type                  | `unknown` with type guards       |
| `@ts-ignore`                | Fix the underlying type issue    |
| Nested ternaries            | `if/else` or `switch` statements |
| Ignoring Promise rejections | Always handle errors             |
| Mutations                   | Immutable operations             |

```typescript
// ❌ Bad
const result: any = await someOperation();

// ✅ Good
const result: unknown = await someOperation();
if (isConnectionResult(result)) {
  // now result is properly typed
}

// ❌ Bad
function processData(data: any) {
  return data.something?.else;
}

// ✅ Good
function processData(data: unknown): string | undefined {
  if (isDataObject(data) && typeof data.something?.else === 'string') {
    return data.something.else;
  }
  return undefined;
}
```

## Async/Await

- Always use `async/await` over Promise chains
- Handle errors with `try/catch` blocks
- Use `Promise.allSettled()` for parallel operations that can fail independently
- Use `void` only for fire-and-forget operations

## Testing

```typescript
// ✅ Good - Descriptive test structure
describe('MyView', () => {
  describe('when rendering the view', () => {
    it('should show the greeting message', async () => {
      // Arrange
      const config: ViewConfig = { title: 'Test View' };

      // Act
      const result = await renderView(config);

      // Assert
      expect(result.success).toBe(true);
    });
  });
});
```
