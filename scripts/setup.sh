#!/usr/bin/env bash
#
# edu-platform — automated setup script (macOS / Linux)
#
# What it does, in order:
#   1. Checks for Node.js, npm, and git (fails fast with install instructions if missing)
#   2. Installs backend + frontend dependencies
#   3. Creates backend/.env and frontend/.env from the .example files if missing,
#      and auto-generates a random JWT_SECRET
#   4. Runs `prisma generate` (safe, no DB connection needed)
#   5. Optionally runs `prisma migrate dev` IF a real DATABASE_URL is detected
#   6. Runs a build check on both backend and frontend
#   7. Initializes git (if not already a repo), adds .gitignore/README/LICENSE
#   8. Makes the first commit
#   9. Optionally creates a GitHub repo (via `gh` CLI) and pushes, if you want
#
# Usage:
#   chmod +x scripts/setup.sh
#   ./scripts/setup.sh
#
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ---------- colors ----------
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()  { echo -e "${BLUE}==>${NC} $1"; }
ok()    { echo -e "${GREEN}✓${NC} $1"; }
warn()  { echo -e "${YELLOW}!${NC} $1"; }
fail()  { echo -e "${RED}✗ $1${NC}"; exit 1; }

# ---------- 1. prerequisite checks ----------
info "Checking prerequisites..."

command -v node >/dev/null 2>&1 || fail "Node.js not found. Install it from https://nodejs.org (v18+) then re-run this script."
command -v npm  >/dev/null 2>&1 || fail "npm not found. It ships with Node.js — reinstall Node from https://nodejs.org."
command -v git  >/dev/null 2>&1 || fail "git not found. Install it: macOS -> 'brew install git', Debian/Ubuntu -> 'sudo apt install git'."

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 18 ]; then
  fail "Node.js 18+ required, found $(node -v). Upgrade via https://nodejs.org or a version manager like nvm."
fi
ok "Node $(node -v), npm $(npm -v), git $(git --version | awk '{print $3}') all present"

# ---------- 2. install dependencies ----------
info "Installing backend dependencies..."
(cd backend && npm install) || fail "Backend npm install failed"
ok "Backend dependencies installed"

info "Installing frontend dependencies..."
(cd frontend && npm install) || fail "Frontend npm install failed"
ok "Frontend dependencies installed"

# ---------- 3. environment files ----------
info "Setting up environment files..."

if [ ! -f backend/.env ]; then
  cp backend/.env.example backend/.env
  # Generate a real random JWT secret instead of leaving the placeholder
  if command -v openssl >/dev/null 2>&1; then
    JWT_SECRET=$(openssl rand -hex 32)
    # portable in-place sed for both GNU and BSD sed
    sed -i.bak "s#^JWT_SECRET=.*#JWT_SECRET=\"$JWT_SECRET\"#" backend/.env && rm -f backend/.env.bak
    ok "backend/.env created with an auto-generated JWT_SECRET"
  else
    warn "backend/.env created from example — openssl not found, please set JWT_SECRET manually"
  fi
else
  ok "backend/.env already exists, leaving it untouched"
fi

if [ ! -f frontend/.env ]; then
  cp frontend/.env.example frontend/.env
  ok "frontend/.env created"
else
  ok "frontend/.env already exists, leaving it untouched"
fi

warn "backend/.env still needs: DATABASE_URL, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET"
warn "See README.md sections on Neon/Supabase and Cloudflare R2 for step-by-step account setup."

# ---------- 4. prisma generate (safe, no DB needed) ----------
info "Generating Prisma client..."
(cd backend && npx prisma generate) || fail "prisma generate failed"
ok "Prisma client generated"

# ---------- 5. optional DB migration ----------
DB_URL=$(grep -E '^DATABASE_URL=' backend/.env | cut -d'"' -f2 || true)
if [ -n "$DB_URL" ] && [[ "$DB_URL" != *"user:password@host"* ]]; then
  read -r -p "$(echo -e "${YELLOW}?${NC} A real DATABASE_URL was detected. Run 'prisma migrate dev' now? [y/N] ")" RUN_MIGRATE
  if [[ "$RUN_MIGRATE" =~ ^[Yy]$ ]]; then
    (cd backend && npx prisma migrate dev --name init) || fail "prisma migrate dev failed"
    ok "Database migrated"
    read -r -p "$(echo -e "${YELLOW}?${NC} Seed the first school + owner account now? [y/N] ")" RUN_SEED
    if [[ "$RUN_SEED" =~ ^[Yy]$ ]]; then
      read -r -p "School name [مدرسة تجريبية]: " SCHOOL_NAME
      read -r -p "Owner email [owner@platform.com]: " OWNER_EMAIL
      read -r -p "Owner password [ChangeMe123!]: " OWNER_PASSWORD
      SCHOOL_NAME=${SCHOOL_NAME:-مدرسة تجريبية}
      OWNER_EMAIL=${OWNER_EMAIL:-owner@platform.com}
      OWNER_PASSWORD=${OWNER_PASSWORD:-ChangeMe123!}
      (cd backend && npm run seed -- --school="$SCHOOL_NAME" --email="$OWNER_EMAIL" --password="$OWNER_PASSWORD") \
        || fail "Seed script failed"
      ok "Seed complete — log in with $OWNER_EMAIL"
    fi
  fi
else
  warn "No real DATABASE_URL yet — skipping migration. Set it in backend/.env, then run:"
  warn "  cd backend && npx prisma migrate dev --name init && npm run seed"
fi

# ---------- 6. build check ----------
info "Running backend build check..."
(cd backend && npm run build) || fail "Backend build failed — check the TypeScript errors above"
ok "Backend builds cleanly"

info "Running frontend build check..."
(cd frontend && npm run build) || fail "Frontend build failed — check the errors above"
ok "Frontend builds cleanly"

# ---------- 7. git init + housekeeping files ----------
info "Preparing git repository..."

if [ ! -d .git ]; then
  git init -q
  ok "Initialized new git repository"
else
  ok "Git repository already initialized"
fi

if [ ! -f .gitignore ]; then
  warn ".gitignore missing — this shouldn't happen if you unzipped the full project. Creating a minimal one."
  cat > .gitignore << 'EOF'
node_modules/
dist/
.env
*.log
EOF
fi

if [ ! -f LICENSE ]; then
  warn "LICENSE missing — creating MIT LICENSE. Edit the year/name or replace it if you want a different license."
  YEAR=$(date +%Y)
  cat > LICENSE << EOF
MIT License

Copyright (c) $YEAR

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
EOF
fi

# ---------- 8. first commit ----------
info "Staging and committing..."
git add -A
if git diff --cached --quiet; then
  ok "Nothing new to commit"
else
  git commit -q -m "Initial commit: edu-platform (backend + frontend)"
  ok "Committed"
fi

# ---------- 9. optional GitHub push ----------
print_manual_push_instructions() {
  echo
  echo -e "${BLUE}Manual push instructions:${NC}"
  echo "  1. Create an empty repo on https://github.com/new (do NOT initialize with a README)"
  echo "  2. Then run:"
  echo "       git remote add origin https://github.com/<your-username>/<repo-name>.git"
  echo "       git branch -M main"
  echo "       git push -u origin main"
}

echo
read -r -p "$(echo -e "${YELLOW}?${NC} Create a GitHub repo and push now? [y/N] ")" DO_PUSH
if [[ "$DO_PUSH" =~ ^[Yy]$ ]]; then
  if command -v gh >/dev/null 2>&1; then
    if gh auth status >/dev/null 2>&1; then
      read -r -p "Repo name [edu-platform]: " REPO_NAME
      REPO_NAME=${REPO_NAME:-edu-platform}
      read -r -p "Public or private? [private/public] (default private): " VISIBILITY
      VISIBILITY=${VISIBILITY:-private}
      gh repo create "$REPO_NAME" --"$VISIBILITY" --source=. --remote=origin --push \
        && ok "Repo created and pushed: $(gh repo view --json url -q .url)" \
        || fail "gh repo create failed — check the error above"
    else
      warn "'gh' CLI found but not authenticated. Run 'gh auth login' first, then re-run this script,"
      warn "or push manually — see the instructions below."
      print_manual_push_instructions
    fi
  else
    warn "GitHub CLI ('gh') not found. Install it from https://cli.github.com, or push manually:"
    print_manual_push_instructions
  fi
else
  print_manual_push_instructions
fi

echo
ok "Setup complete!"
echo -e "  ${BLUE}Backend:${NC}  cd backend && npm run start:dev   (http://localhost:4000/api)"
echo -e "  ${BLUE}Frontend:${NC} cd frontend && npm run dev        (http://localhost:5173)"
