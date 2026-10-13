@AGENTS.md

## Git Workflow

Follow [GIT_WORKFLOW.md](GIT_WORKFLOW.md). Read it before starting any development task.

Before editing files:

- Run `git branch --show-current` and `git status` and report the branch and the state of the working tree.
- Do not make feature changes directly on `main`. If on `main`, propose a branch name (`feature/*`, `fix/*`, `refactor/*`, `docs/*`, `hotfix/*`) and create it from an up-to-date `main` before editing.
- Preserve existing uncommitted and untracked changes. Never run `git reset --hard`, `git checkout -- <file>`, `git restore`, `git clean`, `git stash drop`, or anything else that discards work without explicit permission.
- Do not change remotes, rename or delete branches, rewrite history, or force-push. Never force-push to `main`.
- Never stage or commit `.env` files, env backups, credentials, or keys. Stage files by name, not with `git add .`.

After making changes:

- Run the validation commands from GIT_WORKFLOW.md section 5: `npx tsc --noEmit`, `npm run lint`, `npm run build`. There is no automated test suite; do not invent one. Do not run the Chrome DevTools browser; the owner tests in the browser by hand.
- For changes that also touch `iedcsk-api`, use the same branch name there and verify the API contract (GIT_WORKFLOW.md section 6).
- Summarize what changed (files and why) and the exact validation results, including any failures.
- Propose a Conventional Commit message, then stop and ask for explicit approval before any commit, push, merge, PR creation, or deployment. Approval for one of these actions does not cover the others.
