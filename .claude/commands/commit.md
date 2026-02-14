---
description: Create a conventional commit by analyzing staged/unstaged changes and drafting a commitlint-compliant message
argument-hint: Optional hint about the nature of the changes (e.g., "bugfix for config parsing")
---

# Commit

Create a well-formed conventional commit for the current changes. Follow the commit-guide skill for message formatting rules.

## Phase 1: Assess Changes

Examine the working tree to understand what has changed.

**Actions**:
1. Run `git status` to see staged and unstaged files (never use `-uall` flag)
2. Run `git diff --cached` to see staged changes in detail
3. Run `git diff` to see unstaged changes in detail
4. If there are no changes at all (nothing staged, nothing unstaged, no untracked files), inform the user and stop
5. Run `git log --oneline -5` to see recent commit messages for style consistency

If there are unstaged changes or untracked files but nothing staged, ask the user which files they want to include in the commit. Do NOT run `git add -A` or `git add .` without explicit user approval — prefer adding specific files by name.

---

## Phase 2: Analyze and Draft

Using the commit-guide skill as your formatting reference, analyze the changes and draft a commit message.

User hint: $ARGUMENTS

**Actions**:
1. Identify the primary *type* of change (feat, fix, refactor, docs, chore, etc.) based on what the diff actually does
2. Determine the appropriate *scope* from the Meridian monorepo layout (core, adapter-github, adapter-jira, adapter-local, mcp-server, rest-api, heart, shared, cli, tracker, deps, ci, claude, planning) or omit if changes span multiple packages
3. Write a concise subject line in imperative mood, lowercase, no period, under 72 characters
4. If the changes are non-trivial, draft a body explaining *what* changed and *why*
5. If the user provided $ARGUMENTS, use that hint to inform the message but always verify it matches the actual diff
6. Check for breaking changes and add the appropriate notation if needed
7. Do NOT include a `Co-Authored-By` trailer — that will be added automatically

---

## Phase 3: Execute Commit

Create the commit with the approved message.

**Actions**:
1. If there are files that need staging (approved by user in Phase 1), stage them now with specific file names
2. Create the commit using the approved message with the Co-Authored-By trailer appended
3. Use a heredoc to pass the commit message to avoid shell escaping issues:
   ```bash
   git commit -m "$(cat <<'EOF'
   type(scope): subject line

   Optional body.

   Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
   EOF
   )"
   ```
4. Run `git status` after the commit to verify it succeeded
5. If a pre-commit hook fails:
   - Report the error to the user
   - Do NOT use `--no-verify` to bypass hooks
   - Fix the issue if possible
   - Create a NEW commit (do NOT amend the previous commit)
6. Display the resulting commit hash and summary
