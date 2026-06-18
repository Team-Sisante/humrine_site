# Restoring Features Commit‑by‑Commit (Cherry‑Pick & Test)
## Source: Docs/Trouble-shooting/Restoring files from previous commit.md
## Troubleshooting the Humrine application

### Current state example
```bash
$ git log --pretty=format:"%h %s"
cc8ae11 feat: implement interactive environment loading for Docker compose in staging
61e842a Revert to exact state of 537b909
160d807 Revert "3.4 – Add fallback/error handling for API."
866c137 feat: add startup repair command to fix volume ownership for staging and production services
14609ec feat: add backup and restore functionality for affiliate database in admin panel
95ba7e0 feat: ensure persistent data directory exists with correct ownership in Dockerfile
6350078 feat: add data directory creation and update volume configuration in Docker setup
fd179cf fix: adjust volume definitions for staging and production services in docker-compose
b1b1496 feat: implement database backup and restore functionality in admin panel
537b909 3.4 – Add fallback/error handling for API.
```

### Objective

After reverting to a stable state (e.g., `537b909`), you want to **re‑apply only the good commits** that came after it, **one at a time**, testing each change before moving to the next. This prevents accidental regressions and allows immediate fixes if a commit introduces an issue.

### Prerequisites

- Your working directory is already at the desired base commit (the revert commit that matches `537b909`).
- You have a list of commits to re‑apply, in **chronological order** (oldest first).

From the history above, the commits to restore (after `537b909`, excluding the revert `160d807` and the combined revert `61e842a`) are:

```
b1b1496 (oldest) → fd179cf → 6350078 → 95ba7e0 → 14609ec → 866c137 (newest)
```

### Procedure

1. **Create a new working branch (optional but recommended)**

   ```bash
   git checkout -b apply-good-commits
   ```

2. **Cherry‑pick the first (oldest) commit**

   ```bash
   git cherry-pick b1b1496
   ```

3. **Resolve conflicts (if any)**

   If Git reports a conflict:

   - Edit the conflicting files to resolve the issue.
   - Stage the resolved files: `git add <file>`
   - Continue: `git cherry-pick --continue`

4. **Test the application**

   - Run your development server, tests, or manually verify the feature.
   - Check that the changes introduced by this commit work correctly.

5. **If something is broken, fix it now**

   Make the necessary corrections in the code.

   - Stage the corrections: `git add .`
   - Amend the cherry‑picked commit (keeping its original message):

     ```bash
     git commit --amend --no-edit
     ```

   This integrates your fix into the current commit, so the final history stays clean.

6. **Confirm the commit and proceed to the next one**

   ```bash
   git log -1   # verify the current state
   git cherry-pick <next-commit-hash>
   ```

   Repeat steps 3‑5 for each remaining commit.

7. **Final verification**

   After the last commit is applied and tested, run a full regression check to ensure everything works together.

8. **Merge back (if needed)**

   Once satisfied, merge the branch into your main working branch:

   ```bash
   git checkout main
   git merge apply-good-commits
   ```

### Example session

```bash
git checkout -b apply-good-commits
git cherry-pick b1b1496      # backup/restore feature
# test … OK
git cherry-pick fd179cf      # volume adjustments
# conflict: resolve, git add, git cherry-pick --continue
# test … OK
git cherry-pick 6350078      # data directory creation
# test … fails (permission denied)
# fix code, git add, git commit --amend --no-edit
git cherry-pick 95ba7e0      # ownership fix
# test … OK
git cherry-pick 14609ec      # admin backup/restore
# test … OK
git cherry-pick 866c137      # startup repair (if needed)
# test … OK
```

### Benefits

- **Safety** – you catch errors immediately, not days later.
- **Clean history** – each commit remains atomic and correct.
- **Flexibility** – you can easily skip a commit that turns out to be harmful.

### When to use this technique

- After a large revert, when you need to selectively re‑apply features.
- When you suspect a series of commits may contain regressions, and you want to isolate them.
- For any situation where you must carefully reintroduce past changes while testing each step.

Always communicate with your team before cherry‑picking shared commits, especially if the original commits are already public.