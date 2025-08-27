# Interface Change Detection Tools

## Overview

Automated tools to enforce the Interface Freeze Rule: any change to public interfaces after Stage 3 requires returning to Stage 3, re-approval, and regenerating affected tests.

## Pre-commit Hook Setup

### 1. Interface Hash Generator

Create a hash of all interface definitions to detect changes:

```bash
#!/bin/bash
# scripts/generate-interface-hash.sh

# Find all interface files
INTERFACE_FILES=$(find src -name "*.interface.ts" -o -name "*.contract.ts" -o -name "*Pact.ts")

# Generate hash of interface contents
INTERFACE_HASH=$(cat $INTERFACE_FILES | sha256sum | cut -d' ' -f1)

# Store hash with timestamp
echo "{\"hash\": \"$INTERFACE_HASH\", \"timestamp\": \"$(date -u +%Y-%m-%dT%H:%M:%SZ)\", \"stage\": \"3-frozen\"}" > .aipp/interface-freeze.json

echo "Interface hash generated: $INTERFACE_HASH"
```

### 2. Interface Change Validator

Pre-commit hook to prevent unauthorized interface changes:

```bash
#!/bin/bash
# .git/hooks/pre-commit

# Check if we're past Stage 3
if [ -f ".aipp/interface-freeze.json" ]; then
    # Calculate current interface hash
    CURRENT_HASH=$(find src -name "*.interface.ts" -o -name "*.contract.ts" -o -name "*Pact.ts" | xargs cat | sha256sum | cut -d' ' -f1)

    # Get frozen hash
    FROZEN_HASH=$(jq -r '.hash' .aipp/interface-freeze.json)

    if [ "$CURRENT_HASH" != "$FROZEN_HASH" ]; then
        echo "❌ INTERFACE FREEZE VIOLATION DETECTED"
        echo "Interfaces have been modified after Stage 3 freeze."
        echo "To proceed:"
        echo "1. Return to Stage 3 (Thought Experiment)"
        echo "2. Get re-approval for interface changes"
        echo "3. Regenerate affected tests"
        echo "4. Run: npm run aipp:unfreeze-interfaces"
        exit 1
    fi
fi

# Continue with normal pre-commit checks
npm run lint
npm run test:unit
```

## Contract Testing Framework

### 1. Interface Contract Tests

Automatically generated contract tests for all public interfaces:

```typescript
// tests/contracts/interface.contract.test.ts
import {
  ExampleInput,
  ExampleOutput,
  listUserItems,
} from "../src/interfaces/ExamplePact";

describe("Interface Contract: listUserItems", () => {
  describe("Input Validation", () => {
    it("should accept valid input structure", () => {
      const validInput: ExampleInput = {
        userId: "user-123",
        limit: 50,
        correlationId: "corr-456",
      };

      expect(() => validateInput(validInput)).not.toThrow();
    });

    it("should reject invalid userId", () => {
      const invalidInput = {
        userId: "", // Invalid: empty string
        correlationId: "corr-456",
      };

      expect(() => validateInput(invalidInput)).toThrow("Invalid userId");
    });

    it("should reject invalid limit range", () => {
      const invalidInput: ExampleInput = {
        userId: "user-123",
        limit: 101, // Invalid: exceeds max 100
        correlationId: "corr-456",
      };

      expect(() => validateInput(invalidInput)).toThrow(
        "Limit must be between 1 and 100",
      );
    });
  });

  describe("Output Contract", () => {
    it("should return valid output structure", async () => {
      const mockOutput: ExampleOutput = {
        items: [
          {
            id: "item-1",
            title: "Test Item",
            createdAt: "2023-01-01T00:00:00Z",
          },
        ],
        nextCursor: "cursor-123",
      };

      expect(validateOutput(mockOutput)).toBe(true);
    });

    it("should handle empty results", async () => {
      const emptyOutput: ExampleOutput = {
        items: [],
      };

      expect(validateOutput(emptyOutput)).toBe(true);
    });
  });

  describe("Error Contracts", () => {
    it("should throw UserError for invalid input", async () => {
      const invalidInput = { userId: "", correlationId: "test" };

      await expect(listUserItems(invalidInput)).rejects.toThrow(UserError);
    });

    it("should throw SystemError for transient failures", async () => {
      // Mock system failure scenario
      jest
        .spyOn(database, "query")
        .mockRejectedValue(new Error("Connection timeout"));

      const validInput: ExampleInput = {
        userId: "user-123",
        correlationId: "test",
      };

      await expect(listUserItems(validInput)).rejects.toThrow(SystemError);
    });
  });
});
```

### 2. Backward Compatibility Checker

Tool to verify new interface versions maintain backward compatibility:

```typescript
// scripts/compatibility-checker.ts
interface CompatibilityReport {
  compatible: boolean;
  breakingChanges: string[];
  warnings: string[];
}

export function checkBackwardCompatibility(
  oldInterface: any,
  newInterface: any,
): CompatibilityReport {
  const report: CompatibilityReport = {
    compatible: true,
    breakingChanges: [],
    warnings: [],
  };

  // Check for removed properties
  for (const prop in oldInterface) {
    if (!(prop in newInterface)) {
      report.compatible = false;
      report.breakingChanges.push(`Removed property: ${prop}`);
    }
  }

  // Check for type changes
  for (const prop in oldInterface) {
    if (prop in newInterface) {
      if (typeof oldInterface[prop] !== typeof newInterface[prop]) {
        report.compatible = false;
        report.breakingChanges.push(`Type changed for property: ${prop}`);
      }
    }
  }

  // Check for new required properties
  for (const prop in newInterface) {
    if (!(prop in oldInterface) && isRequired(newInterface[prop])) {
      report.compatible = false;
      report.breakingChanges.push(`Added required property: ${prop}`);
    }
  }

  return report;
}
```

## Package.json Scripts

Add these scripts to automate interface management:

```json
{
  "scripts": {
    "aipp:freeze-interfaces": "bash scripts/generate-interface-hash.sh",
    "aipp:unfreeze-interfaces": "rm -f .aipp/interface-freeze.json && echo 'Interface freeze removed. Remember to regenerate tests!'",
    "aipp:check-interfaces": "bash scripts/check-interface-changes.sh",
    "aipp:contract-tests": "jest tests/contracts --testNamePattern='Contract'",
    "aipp:compatibility-check": "ts-node scripts/compatibility-checker.ts"
  }
}
```

## GitHub Actions Workflow

```yaml
# .github/workflows/interface-freeze.yml
name: Interface Freeze Validation

on:
  pull_request:
    paths:
      - "src/**/*.interface.ts"
      - "src/**/*.contract.ts"
      - "src/**/*Pact.ts"

jobs:
  check-interface-freeze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "18"

      - name: Install dependencies
        run: npm ci

      - name: Check interface freeze compliance
        run: npm run aipp:check-interfaces

      - name: Run contract tests
        run: npm run aipp:contract-tests

      - name: Check backward compatibility
        run: npm run aipp:compatibility-check
```

## IDE Integration

### VS Code Extension Configuration

```json
// .vscode/settings.json
{
  "files.associations": {
    "*.interface.ts": "typescript",
    "*.contract.ts": "typescript",
    "*Pact.ts": "typescript"
  },
  "typescript.preferences.readonly": [
    "**/*.interface.ts",
    "**/*.contract.ts",
    "**/*Pact.ts"
  ]
}
```

### Interface Freeze Status Bar

```typescript
// .vscode/extensions/aipp/src/interface-status.ts
export function showInterfaceFreezeStatus() {
  const statusBarItem = vscode.window.createStatusBarItem(
    vscode.StatusBarAlignment.Left,
    100,
  );

  if (isInterfaceFrozen()) {
    statusBarItem.text = "🔒 Interfaces Frozen (Stage 3+)";
    statusBarItem.color = "#ff6b6b";
  } else {
    statusBarItem.text = "🔓 Interfaces Editable (Stage 1-2)";
    statusBarItem.color = "#51cf66";
  }

  statusBarItem.show();
}
```

## Usage Instructions

1. **Stage 1-2**: Interfaces are freely editable
2. **Stage 3**: Run `npm run aipp:freeze-interfaces` to lock interfaces
3. **Stage 4+**: Pre-commit hooks prevent unauthorized changes
4. **Interface Changes**: Run `npm run aipp:unfreeze-interfaces` and return to Stage 3
5. **Contract Testing**: All interface contracts are automatically tested
