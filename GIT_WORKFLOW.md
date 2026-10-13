# Git Workflow — iedcsk (Next.js frontend)

This repository uses a simple **Feature Branch Workflow**. The backend lives in a separate repository, `iedcsk-api` (Laravel), which follows the same workflow.

- Remote: `origin` → `https://github.com/step-phen/iedcsk.git`
- Default branch: `main`
- There is **no** permanent `develop` branch. Every short-lived branch starts from `main` and returns to `main` through a Pull Request.

## 1. Branches

| Branch       | Purpose                                         | Starts from |
| ------------ | ----------------------------------------------- | ----------- |
| `main`       | Stable, production-ready code                   | —           |
| `feature/*`  | New features                                    | `main`      |
| `fix/*`      | Bug fixes                                       | `main`      |
| `refactor/*` | Code improvements with no behavior change       | `main`      |
| `docs/*`     | Documentation-only changes                      | `main`      |
| `hotfix/*`   | Urgent fixes to what is currently in production | `main`      |

Naming: lowercase, kebab-case, short and descriptive.

```
feature/attendance-export
fix/learner-login-redirect
refactor/game-registry-lookup
docs/git-workflow
hotfix/class-start-crash
```

## 2. Rules

1. Never implement new features directly on `main`.
2. Check the current branch and working tree before editing files.
3. Create a feature branch when needed, after confirming the starting point is correct.
4. Use Conventional Commits.
5. Review the diff before committing.
6. Run the validation commands (section 5) before proposing a merge.
7. Never force-push to `main`.
8. Never commit sensitive files (`.env`, `.env.local`, credentials, keys).
9. Do not automatically commit, push, merge, or deploy.
10. Get explicit approval from the project owner before every commit, push, merge, or deployment.

## 3. Daily flow

### 3.1 Check where you are

```sh
git branch --show-current
git status
```

- On `main` with a clean tree: safe to create a new branch.
- On `main` with uncommitted changes: those changes are someone's work in progress. Do not stash, reset, or discard them. `git switch -c <branch>` carries them onto the new branch unchanged; confirm with the owner first that they belong to the new task.
- Already on a work branch: confirm it is the right branch for the task before editing.

### 3.2 Make sure the starting point is current

```sh
git fetch origin
git status          # shows "behind 'origin/main' by N commits" if local main is stale
```

If local `main` is behind and the working tree is clean, fast-forward it:

```sh
git switch main
git pull --ff-only
```

If `--ff-only` refuses (local `main` has diverged), stop and ask; do not merge or rebase `main` on your own.

### 3.3 Create the branch

```sh
git switch -c feature/<short-name>
```

### 3.4 Work, then review

```sh
git status
git diff                # unstaged
git diff --staged       # staged
```

Check that the diff contains only what the task needs: no debug logs, no stray files, no secrets, no unrelated formatting churn.

Note: `next dev` may re-add the `nextjs-agent-rules` block to `AGENTS.md`. That change is expected; it can be committed with the work.

### 3.5 Commit (with approval)

Stage files by name rather than `git add .`, so nothing unintended slips in:

```sh
git add src/components/foo/Foo.tsx src/lib/api.ts
git commit -m "feat(attendance): add CSV export button"
```

### 3.6 Push and open a Pull Request (with approval)

```sh
git push -u origin feature/<short-name>
```

Open a PR into `main` on GitHub. After it is merged, delete the branch.

## 4. Conventional Commits

Format: `<type>(<optional scope>): <summary>`

| Type       | Use for                                        |
| ---------- | ---------------------------------------------- |
| `feat`     | New feature                                    |
| `fix`      | Bug fix                                        |
| `refactor` | Code change with no behavior change            |
| `docs`     | Documentation only                             |
| `style`    | Formatting only, no logic change               |
| `perf`     | Performance improvement                        |
| `test`     | Adding or changing tests                       |
| `build`    | Dependencies, build configuration              |
| `chore`    | Maintenance that fits none of the above        |

Rules: imperative mood ("add", not "added"), lowercase summary, no trailing period, summary under ~72 characters. Add a body when the *why* is not obvious. Mark breaking changes with `!` (`feat(api)!: ...`) and a `BREAKING CHANGE:` footer.

Examples:

```
feat(games): add Find the Bb reading activity
fix(learner): stop double submit on slow networks
refactor(api): share CSRF retry logic in apiFetch
docs: add Git workflow guide
```

## 5. Validation before proposing a merge

Run from the repository root. These are the only checks available in this project today.

| Check            | Command              | Source                                           |
| ---------------- | -------------------- | ------------------------------------------------ |
| TypeScript       | `npx tsc --noEmit`   | `typescript` devDependency (no npm script exists) |
| ESLint           | `npm run lint`       | `package.json` script `lint` → `eslint`          |
| Production build | `npm run build`      | `package.json` script `build` → `next build`     |
| Automated tests  | none                 | No test runner or `test` script is configured    |

All three commands must pass. Because there are no automated tests, behavior is verified by hand in the browser by the project owner; describe what should be tested in the PR.

The app is used on a local network and talks to the Laravel API (`NEXT_PUBLIC_API_URL`, or the page's host on port 8000 by default). For changes that call the API, run the backend locally while testing.

## 6. Coordinated frontend + backend changes

When a feature needs both `iedcsk` and `iedcsk-api`:

1. **Matching branch names** in both repositories, for example `feature/attendance-export` in each.
2. **Backend first**: implement the endpoint, Form Request validation, and tests in `iedcsk-api`.
3. **Frontend second**: implement the UI and API calls in `iedcsk`.
4. **Verify the API contract**: the HTTP method, path, request fields, response shape, and status codes used in the frontend (`src/lib/api.ts`, `src/types/`) match the Laravel routes (`routes/api.php`), Form Requests, and controller responses. Validation errors come back as HTTP 422 from Laravel; the frontend only displays them and does not duplicate the rules.
5. **Test the integration** with both apps running locally.
6. **Separate commits and separate PRs**, one per repository. Link each PR to the other in its description.
7. **Deployment compatibility**: merge and deploy the backend first when the frontend depends on new endpoints or fields. Prefer additive API changes (new fields, new endpoints) so the currently deployed frontend keeps working. If a change is breaking, say so in both PRs and plan the order.

## 7. Hotfixes

```sh
git switch main
git pull --ff-only
git switch -c hotfix/<short-name>
```

Keep the change minimal, run section 5 checks, open a PR into `main`, and merge with approval. If the same bug exists on an open feature branch, bring the fix in after it lands on `main`.

## 8. Never

- Force-push to `main` (`git push --force` / `--force-with-lease` on `main`).
- Commit `.env*` files (`.gitignore` excludes `.env*` except `.env.example`), credentials, or keys.
- Run `git reset --hard`, `git checkout -- <file>`, `git restore`, `git clean`, or `git stash drop` on someone's uncommitted work without permission.
- Skip hooks with `--no-verify`.
- Commit, push, merge, or deploy without explicit approval.
