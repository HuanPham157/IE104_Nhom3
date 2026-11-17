# Repository guidance

- The Next.js application is in `frontend/`. Read `frontend/AGENTS.md` and the relevant local Next.js documentation in `frontend/node_modules/next/dist/docs/` before changing app code.
- Run frontend commands from the repository root using `npm run dev`, `npm run build`, `npm run lint`, or use `cd frontend` for package-specific commands.
- Supabase schema and project documentation are in `docs/`; keep backend SQL changes there unless a Supabase CLI migration workflow is introduced.
