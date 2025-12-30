# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

kantan-ui is a Streamlit alternative framework that depends only on Web standards and Hono.

## Tech Stack

- **Runtime**: Bun
- **Framework**: Hono
- **Language**: TypeScript
- **Testing**: Vitest (unit), Playwright (e2e)
- **Linter/Formatter**: Biome

## Common Commands

```bash
bun run dev          # Start dev server
bun run build        # Build for production
bun run test         # Run unit tests
bun run lint         # Check for lint errors
bun run lint:fix     # Auto-fix lint errors
bun run ci           # Run lint, build, and tests
```

## Completion Requirements

Before committing, run:
```bash
bun run lint:fix && bun run ci
```
