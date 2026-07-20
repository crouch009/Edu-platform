# edu-platform - automated setup script (Windows / PowerShell)
#
# What it does, in order:
#   1. Checks for Node.js, npm, and git
#   2. Installs backend + frontend dependencies
#   3. Creates backend\.env and frontend\.env from the .example files if missing,
#      and auto-generates a random JWT_SECRET
#   4. Runs prisma generate
#   5. Optionally runs prisma migrate dev if a real DATABASE_URL is detected
#   6. Runs a build check on both backend and frontend
#   7. Initializes git, adds .gitignore/LICENSE if missing, commits
#   8. Optionally creates a GitHub repo (via gh CLI) and pushes
#
# Usage:
#   Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
#   .\scripts\setup.ps1

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

function Info($msg) { Write-Host "==> $msg" -ForegroundColor Cyan }
function Ok($msg) { Write-Host "OK  $msg" -ForegroundColor Green }
function Warn($msg) { Write-Host "!   $msg" -ForegroundColor Yellow }
function Fail($msg) { Write-Host "X   $msg" -ForegroundColor Red; exit 1 }

# ---------- 1. prerequisite checks ----------
Info "Checking prerequisites..."

$hasNode = Get-Command node -ErrorAction SilentlyContinue
if (-not $hasNode) {
  Fail "Node.js not found. Install it from nodejs.org (v18+) then re-run this script."
}
$hasNpm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $hasNpm) {
  Fail "npm not found. It ships with Node.js - reinstall Node from nodejs.org."
}
$hasGit = Get-Command git -ErrorAction SilentlyContinue
if (-not $hasGit) {
  Fail "git not found. Install it from git-scm.com/download/win."
}

$rawVersion = node -v
$nodeVersion = $rawVersion.Substring(1)
$versionParts = $nodeVersion.Split(".")
$nodeMajor = [int]$versionParts[0]
if ($nodeMajor -lt 18) {
  Fail "Node.js 18+ required, found $rawVersion. Upgrade via nodejs.org."
}
Ok "Node $rawVersion and npm found"

# ---------- 2. install dependencies ----------
Info "Installing backend dependencies..."
Set-Location backend
npm install
if ($LASTEXITCODE -ne 0) { Fail "Backend npm install failed" }
Set-Location $RootDir
Ok "Backend dependencies installed"

Info "Installing frontend dependencies..."
Set-Location frontend
npm install
if ($LASTEXITCODE -ne 0) { Fail "Frontend npm install failed" }
Set-Location $RootDir
Ok "Frontend dependencies installed"

# ---------- 3. environment files ----------
Info "Setting up environment files..."

$backendEnvPath = Join-Path $RootDir "backend\.env"
$backendEnvExamplePath = Join-Path $RootDir "backend\.env.example"

if (-not (Test-Path $backendEnvPath)) {
  Copy-Item $backendEnvExamplePath $backendEnvPath

  $randomBytes = New-Object byte[] 32
  $rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
  $rng.GetBytes($randomBytes)
  $hexChars = $randomBytes | ForEach-Object { $_.ToString("x2") }
  $jwtSecret = [string]::Join("", $hexChars)

  $lines = Get-Content $backendEnvPath
  $newLines = @()
  foreach ($line in $lines) {
    if ($line.StartsWith("JWT_SECRET=")) {
      $newLines += "JWT_SECRET=" + [char]34 + $jwtSecret + [char]34
    } else {
      $newLines += $line
    }
  }
  $newLines | Set-Content $backendEnvPath
  Ok "backend\.env created with an auto-generated JWT_SECRET"
} else {
  Ok "backend\.env already exists, leaving it untouched"
}

$frontendEnvPath = Join-Path $RootDir "frontend\.env"
$frontendEnvExamplePath = Join-Path $RootDir "frontend\.env.example"

if (-not (Test-Path $frontendEnvPath)) {
  Copy-Item $frontendEnvExamplePath $frontendEnvPath
  Ok "frontend\.env created"
} else {
  Ok "frontend\.env already exists, leaving it untouched"
}

Warn "backend\.env still needs: DATABASE_URL, R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET"
Warn "See README.md for step by step Neon/Supabase and Cloudflare R2 setup."

# ---------- 4. prisma generate ----------
Info "Generating Prisma client..."
Set-Location backend
npx prisma generate
if ($LASTEXITCODE -ne 0) { Fail "prisma generate failed" }
Set-Location $RootDir
Ok "Prisma client generated"

# ---------- 5. optional DB migration ----------
$dbUrl = ""
$envLines = Get-Content $backendEnvPath
foreach ($line in $envLines) {
  if ($line.StartsWith("DATABASE_URL=")) {
    $value = $line.Substring(13)
    $dbUrl = $value.Trim([char]34)
  }
}

$looksLikePlaceholder = $dbUrl.Contains("user:password@host")

if ($dbUrl -and (-not $looksLikePlaceholder)) {
  $runMigrate = Read-Host "A real DATABASE_URL was detected. Run prisma migrate dev now? (y/N)"
  if ($runMigrate.ToLower() -eq "y") {
    Set-Location backend
    npx prisma migrate dev --name init
    if ($LASTEXITCODE -ne 0) { Fail "prisma migrate dev failed" }
    Set-Location $RootDir
    Ok "Database migrated"

    $runSeed = Read-Host "Seed the first school and owner account now? (y/N)"
    if ($runSeed.ToLower() -eq "y") {
      $schoolName = Read-Host "School name (default: Demo School)"
      $ownerEmail = Read-Host "Owner email (default: owner@platform.com)"
      $ownerPassword = Read-Host "Owner password (default: ChangeMe123!)"
      if ([string]::IsNullOrWhiteSpace($schoolName)) { $schoolName = "Demo School" }
      if ([string]::IsNullOrWhiteSpace($ownerEmail)) { $ownerEmail = "owner@platform.com" }
      if ([string]::IsNullOrWhiteSpace($ownerPassword)) { $ownerPassword = "ChangeMe123!" }

      Set-Location backend
      $schoolArg = "--school=" + $schoolName
      $emailArg = "--email=" + $ownerEmail
      $passwordArg = "--password=" + $ownerPassword
      npm run seed -- $schoolArg $emailArg $passwordArg
      if ($LASTEXITCODE -ne 0) { Fail "Seed script failed" }
      Set-Location $RootDir
      Ok ("Seed complete - log in with " + $ownerEmail)
    }
  }
} else {
  Warn "No real DATABASE_URL yet - skipping migration. Set it in backend\.env, then run:"
  Warn "  cd backend; npx prisma migrate dev --name init; npm run seed"
}

# ---------- 6. build check ----------
Info "Running backend build check..."
Set-Location backend
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Backend build failed - check the errors above" }
Set-Location $RootDir
Ok "Backend builds cleanly"

Info "Running frontend build check..."
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) { Fail "Frontend build failed - check the errors above" }
Set-Location $RootDir
Ok "Frontend builds cleanly"

# ---------- 7. git init and housekeeping files ----------
Info "Preparing git repository..."

if (-not (Test-Path ".git")) {
  git init -q
  Ok "Initialized new git repository"
} else {
  Ok "Git repository already initialized"
}

if (-not (Test-Path ".gitignore")) {
  Warn ".gitignore missing - creating a minimal one."
  $gitignoreLines = @(
    "node_modules/",
    "dist/",
    ".env",
    "*.log"
  )
  $gitignoreLines | Set-Content ".gitignore"
}

if (-not (Test-Path "LICENSE")) {
  Warn "LICENSE missing - creating MIT LICENSE."
  $year = (Get-Date).Year
  $licenseLines = @(
    "MIT License",
    "",
    "Copyright (c) $year",
    "",
    "Permission is hereby granted, free of charge, to any person obtaining a copy",
    "of this software and associated documentation files (the Software), to deal",
    "in the Software without restriction, including without limitation the rights",
    "to use, copy, modify, merge, publish, distribute, sublicense, and/or sell",
    "copies of the Software, and to permit persons to whom the Software is",
    "furnished to do so, subject to the following conditions:",
    "",
    "The above copyright notice and this permission notice shall be included in all",
    "copies or substantial portions of the Software.",
    "",
    "THE SOFTWARE IS PROVIDED AS IS, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR",
    "IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,",
    "FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE",
    "AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER",
    "LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,",
    "OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE",
    "SOFTWARE."
  )
  $licenseLines | Set-Content "LICENSE"
}

# ---------- 8. first commit ----------
Info "Staging and committing..."
git add -A
git diff --cached --quiet
$hasChanges = ($LASTEXITCODE -ne 0)
if ($hasChanges) {
  git commit -q -m "Initial commit: edu-platform"
  Ok "Committed"
} else {
  Ok "Nothing new to commit"
}

# ---------- 9. optional GitHub push ----------
function Show-ManualPushInstructions {
  Write-Host ""
  Write-Host "Manual push instructions:" -ForegroundColor Cyan
  Write-Host "  1. Create an empty repo on github.com/new (do not initialize with a README)"
  Write-Host "  2. Then run:"
  Write-Host "       git remote add origin <your-repo-url>"
  Write-Host "       git branch -M main"
  Write-Host "       git push -u origin main"
}

Write-Host ""
$doPush = Read-Host "Create a GitHub repo and push now? (y/N)"
if ($doPush.ToLower() -eq "y") {
  $hasGh = Get-Command gh -ErrorAction SilentlyContinue
  if ($hasGh) {
    gh auth status 2>$null
    $isAuthed = ($LASTEXITCODE -eq 0)
    if ($isAuthed) {
      $repoName = Read-Host "Repo name (default: edu-platform)"
      if ([string]::IsNullOrWhiteSpace($repoName)) { $repoName = "edu-platform" }
      $visibility = Read-Host "Public or private? (default: private)"
      if ([string]::IsNullOrWhiteSpace($visibility)) { $visibility = "private" }
      $visibilityFlag = "--" + $visibility
      gh repo create $repoName $visibilityFlag --source=. --remote=origin --push
      if ($LASTEXITCODE -eq 0) {
        Ok "Repo created and pushed"
      } else {
        Fail "gh repo create failed - check the error above"
      }
    } else {
      Warn "gh CLI found but not authenticated. Run: gh auth login"
      Warn "Then re-run this script, or push manually:"
      Show-ManualPushInstructions
    }
  } else {
    Warn "GitHub CLI (gh) not found. Install it from cli.github.com, or push manually:"
    Show-ManualPushInstructions
  }
} else {
  Show-ManualPushInstructions
}

Write-Host ""
Ok "Setup complete!"
Write-Host "  Backend:  cd backend; npm run start:dev   (http://localhost:4000/api)" -ForegroundColor Cyan
Write-Host "  Frontend: cd frontend; npm run dev        (http://localhost:5173)" -ForegroundColor Cyan
