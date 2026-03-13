# NarrVoca — Claude Code Hooks

Claude Code hooks are shell commands that execute automatically in response to session events. This file documents the hook strategy for NarrVoca and tracks any hooks that have been configured.

Hooks are configured in `.claude/settings.local.json` under the `"hooks"` key.

---

## Current Hooks

None active as of 2026-03-13. See "Candidate Hooks" below for planned additions.

---

## How to Configure a Hook

Add to `.claude/settings.local.json`:

```json
{
  "permissions": { ... },
  "hooks": {
    "EventName": [
      {
        "matcher": "optional pattern to match tool input",
        "hooks": [
          {
            "type": "command",
            "command": "bash command to run"
          }
        ]
      }
    ]
  }
}
```

Available events: `PreToolUse`, `PostToolUse`, `Notification`, `Stop`.

---

## Candidate Hooks for This Repository

### PostToolUse → after Edit or Write — run type check
**Purpose:** Catch TypeScript errors immediately after any file is written, without waiting for a manual `tsc` run.
**Risk:** Slow if `tsc` is run on every save. Mitigate by scoping to `lib/narrvoca/` and `src/pages/api/narrvoca/` only.

```json
{
  "matcher": ".*\\.ts$",
  "hooks": [{ "type": "command", "command": "npx tsc --noEmit 2>&1 | head -20" }]
}
```

**Status:** Candidate — not yet activated. Approve before adding to settings.local.json.

---

### PostToolUse → after Edit or Write to test files — run tests
**Purpose:** Auto-run `npm test` after any change to `test/unit/`.
**Risk:** Can be slow (full suite ~30s). Consider scoping to the affected test file via `--testPathPattern`.

```json
{
  "matcher": "test/unit/.*\\.test\\.tsx?$",
  "hooks": [{ "type": "command", "command": "npm test 2>&1 | tail -15" }]
}
```

**Status:** Candidate — not yet activated.

---

### PreToolUse → block writes to protected files
**Purpose:** Raise a visible warning before any edit to `components/ui/`, `app/auth/callback/`, or `supabase/migrations/`.
**Mechanism:** Hook exits non-zero to block, or outputs a warning for review.

**Status:** Candidate — requires testing on Windows (bash hook behavior in Git Bash).

---

## Windows / Git Bash Notes

This project runs on Windows 11 with Git Bash as the shell. Hook commands must use Unix syntax (forward slashes, `/dev/null`, `bash -c "..."`). PowerShell commands will not work in Claude Code hooks on this machine.

---

## Activation Process

Before activating any hook:
1. Test the shell command manually in Git Bash to confirm it works.
2. Add to `settings.local.json` in the `hooks` key.
3. Verify Claude Code picks it up in the next session.
4. Document the activated hook in the "Current Hooks" section above (with date activated).
