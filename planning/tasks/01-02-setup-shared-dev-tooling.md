# Task 1.2: Set Up Shared Dev Tooling

> **Epic:** Core Domain & Foundation
> **Type:** Feature
> **Priority:** High
> **Effort:** Small (< 1 day)
> **Dependencies:** 1.1
> **Status:** Pending

## Goal
Configure shared development tooling across the monorepo so all packages have consistent linting, formatting, and testing from day one.

## Background
The project uses ESLint with @antfu/eslint-config for both linting and formatting (no Prettier). Vitest is the test framework for all TypeScript packages. Consistent tooling ensures code quality and reduces friction when working across packages.

## Acceptance Criteria
- [ ] ESLint configured with @antfu/eslint-config at the monorepo root
- [ ] ESLint handles formatting (no Prettier installed or configured)
- [ ] Vitest configured and runnable via `turbo test` across all packages
- [ ] `turbo lint` runs ESLint across all packages
- [ ] `turbo type-check` runs `tsc --noEmit` across all packages
- [ ] All three commands pass on the empty package stubs

## Subtasks
- [ ] Install and configure @antfu/eslint-config at the root
- [ ] Create root `eslint.config.js` (flat config format)
- [ ] Configure any project-specific ESLint overrides (e.g., TypeScript strict rules)
- [ ] Set up Vitest 3.x with shared configuration
- [ ] Add `lint`, `test`, and `type-check` scripts to each package's `package.json`
- [ ] Add corresponding pipeline entries in `turbo.json`
- [ ] Verify all commands work: `turbo lint`, `turbo test`, `turbo type-check`

## Notes
- @antfu/eslint-config uses ESLint flat config format — no `.eslintrc` files
- Vitest should be configured to find `**/*.test.ts` and `**/*.spec.ts` files
- Consider adding a `vitest.workspace.ts` for monorepo-wide test configuration
