# Instructions for project-codex

- This is a new independent project. Work only within `/workspace/project-codex` for its implementation; do not copy application code, configuration, secrets or data from sibling projects.
- Read `PORTFOLIO_TASKS.md` before implementing a task. Follow the task dependencies, scope and acceptance criteria; record verification before marking it complete.
- When instructed to run the full plan, follow `RUN_ALL_TASKS.md`: continue through all pending tasks, test each task, fix failures and proceed without asking whether to continue. A task boundary does not end the run. Only a demonstrated external blocker after exhausting independent work can require user input.
- Stack: React, TypeScript, Vite, Tailwind CSS; Node.js, Express, TypeScript; PostgreSQL with pg and versioned SQL migrations.
- Add concise Vietnamese comments for functions whose purpose, business rules or behavior are not obvious: game logic, validation, authentication/session handling, database queries/transactions and complex hooks/services. Prefer JSDoc above the function explaining its purpose and rationale; document important input/output contracts, assumptions, side effects or thrown errors when relevant. Inline comments should explain non-obvious decisions. Do not repeat the function name, TypeScript types or self-evident code. Update comments when changing behavior, and review them before marking a task complete.
- Use npm workspaces (`apps/web`, `apps/api`) with one root lockfile. Prefer the existing isolated checkout; do not create Git worktrees unless the user requests one.
- Development ports: web 5173, API 4100. Database names: project_codex_dev and project_codex_test. Use project-specific configuration; never reuse sibling project environment files or databases.
- Keep credentials out of tracked files and logs. Parameterize SQL, validate input and enforce admin authorization in the API.
- Full-plan execution permits generating strong random local development session secrets and admin credentials, stored only in ignored local configuration with appropriate permissions. Never use a fixed default password or print these values.
- Preserve user changes. Do not commit, push, deploy, reset data or create a remote repository unless instructed.
- At bootstrap there is no application yet. Add real development/build/test scripts as part of T02/T03; do not claim placeholder scripts or zero-test runs validate the application.
