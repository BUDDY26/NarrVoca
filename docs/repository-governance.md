# Repository Governance

Rules for AI coding agents operating in this repository.

---

## Git Operations

AI agents **must not** perform any git operations. This includes but is not limited to:

- Running `git commit`, `git push`, `git pull`, or `git fetch`
- Creating, deleting, or switching branches
- Staging or unstaging files (`git add`, `git restore`, `git reset`)
- Amending or rebasing commits
- Modifying commit history in any form (`git rebase -i`, `git commit --amend`, `git reset --hard`)
- Tagging releases or creating annotated tags

The repository owner performs all git operations manually.

---

## Commit Authorship

AI agents **must not** append or inject authorship metadata into commit messages. This includes:

- `Co-authored-by:` trailer lines
- `Signed-off-by:` trailer lines
- Any other trailer that attributes the commit to an AI tool or service

Commit messages are written and owned exclusively by the repository owner.

---

## Scope of AI Agent Work

AI agents are permitted to:

- Read and analyze source files
- Return code changes (diffs, edited file contents, or new file contents)
- Run tests and return verification results
- Report errors, warnings, or test failures

AI agents are **not** permitted to:

- Commit, push, or otherwise write to the git history
- Modify `.git/` directory contents directly
- Create or alter CI/CD pipeline triggers that initiate git operations
- Take any action that has side effects outside the local working tree without explicit user approval

---

## Rationale

The repository owner reviews all changes before they enter version control. Keeping git operations out of the AI agent workflow ensures that:

1. Every commit reflects a deliberate, human-reviewed decision.
2. Commit authorship and history remain accurate and unambiguous.
3. No automated process can alter the canonical history of the repository.
