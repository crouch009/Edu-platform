# Setup Scripts — Usage & Caveats

Two scripts automate everything needed to get `edu-platform` from a fresh
clone/unzip to a running local environment and (optionally) a pushed GitHub
repo: `scripts/setup.sh` (macOS/Linux) and `scripts/setup.ps1` (Windows).

## What they do (in order)

1. Check for Node.js 18+, npm, and git — fail with clear install links if missing
2. `npm install` in both `backend/` and `frontend/`
3. Create `backend/.env` and `frontend/.env` from the `.example` files if they
   don't already exist, auto-generating a random `JWT_SECRET`
4. Run `npx prisma generate` (safe — no database connection required)
5. **Ask** whether to run `prisma migrate dev` — only offered if a real
   `DATABASE_URL` is already present in `backend/.env` (not the placeholder)
6. **Ask** whether to seed the first school + owner account
7. Run a build check on both backend and frontend (`npm run build`)
8. `git init` if not already a repo, create `.gitignore`/`LICENSE` if missing, commit
9. **Ask** whether to create a GitHub repo and push — uses the `gh` CLI if
   installed and authenticated, otherwise prints manual push instructions

Every destructive or account-creating step (DB migration, seeding, GitHub
repo creation) requires an explicit "y" — nothing happens silently.

## Running it

### macOS / Linux
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

### Windows (PowerShell)
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup.ps1
```
(The `Set-ExecutionPolicy` line is only needed because Windows blocks
unsigned scripts by default — it only affects the current PowerShell
session, not your whole system.)

## Before you run it

You still need real values for these — the script can't invent them for you:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Neon or Supabase — see main `README.md` § "إعداد قاعدة البيانات" |
| `R2_ENDPOINT` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET` | Cloudflare R2 — see main `README.md` § "إعداد Cloudflare R2" |
| `RESEND_API_KEY` (optional) | resend.com — only needed for real password-reset/notification emails |
| `TWILIO_*` (optional) | twilio.com — only needed for real SMS notifications |

Without `DATABASE_URL`, the script still installs everything and builds
successfully — it just skips the migration/seed steps and tells you the
exact commands to run once you've added it.

## GitHub push — what "via CLI" actually requires

The automatic push step only works if:
- [GitHub CLI](https://cli.github.com) is installed, **and**
- you've already run `gh auth login` once on this machine

If either is missing, the script doesn't fail — it just prints the manual
3-command push sequence (`git remote add origin ... && git push -u origin main`)
so you can do it by hand after creating an empty repo on github.com.

## Caveats

- The scripts are **idempotent for setup steps** (safe to re-run — they skip
  `.env` creation if the file already exists, skip `git init` if already a
  repo, etc.) but **not idempotent for the GitHub push step** — running it
  twice with the same repo name will fail the second time since the repo
  already exists. That's expected; just skip that prompt on re-runs.
- The auto-generated `JWT_SECRET` is written directly into `backend/.env`,
  which is git-ignored — it will never end up in your commit history as long
  as you don't remove `.env` from `.gitignore`.
- The build-check step (`npm run build`) does **not** require `DATABASE_URL`
  to point at a reachable database — `prisma generate` only needs the schema
  file, not a live connection. The database only needs to be reachable for
  the `migrate dev` and `seed` steps.
- If you're re-running the script on a machine where you've already pushed
  once, git will ask for credentials on `gh repo create --push` only if your
  `gh` session expired — run `gh auth status` to check first.
