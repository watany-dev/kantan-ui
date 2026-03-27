# Bugs Found During Tutorial Development

The following bugs were discovered while building the 10 tutorial apps.

---

## Bug 1: `kt.columns()` example uses incorrect API signature

**Severity**: High (runtime crash)

**Description**: The example in `examples/14-dynamic-content.ts` and `docs/design/chat-input.md` use a `columns()` call signature that doesn't match the actual implementation in `src/kt/layout.ts`.

**Current (incorrect) usage in examples**:
```typescript
kt.columns([0.33, 0.33, 0.34], (col) => {
  col[0](() => { kt.button("Write"); });
  col[1](() => { kt.button("Success"); });
});
```

This passes an array of **numbers** as the first argument, but the implementation expects `Array<() => void>`. At runtime, `content()` at `layout.ts:202` calls `0.33()`, which throws a TypeError.

**Correct usage (matching implementation)**:
```typescript
kt.columns(
  [
    () => { kt.button("Write"); },
    () => { kt.button("Success"); },
  ],
  { ratios: [0.33, 0.33, 0.34] },
);
```

**Affected files**:
- `examples/14-dynamic-content.ts` (lines 45, 70, 162)
- `docs/design/chat-input.md` (line 149)

**Recommendation**: Either fix the examples to match the current API, or add an overloaded `columns()` signature that supports `(ratios, callback)` pattern.

---

## Bug 2: `kt.progress()` docs reference non-existent `text` config option

**Severity**: Low (documentation only)

**Description**: The tutorial documentation `docs/TUTORIAL.md` references `{ text: "..." }` as a config option for `kt.progress()`, but `ProgressConfig` only has `label`, not `text`.

**In docs (incorrect)**:
```typescript
progress.progress(0.25, { text: "25% 完了" });
```

**Correct**:
```typescript
kt.progress(0.25, { label: "25% 完了" });
```

**Affected files**:
- `docs/TUTORIAL.md` (lines 1268, 1270)
