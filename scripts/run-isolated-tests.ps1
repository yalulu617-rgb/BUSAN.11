# Runs Playwright against a DISPOSABLE copy (tests/global-setup.js rewrites js/firebase.js
# with a synthetic in-memory Firebase). Never touches the real source or real Firebase.
# No network pushes, no GitHub Actions. Usage: scripts/run-isolated-tests.ps1 tests/foo.spec.js [more args]
param([Parameter(ValueFromRemainingArguments=$true)][string[]]$TestArgs)
$src = Split-Path -Parent $PSScriptRoot
$dst = Join-Path $env:TEMP 'busan11-isolated-copy'
if (Test-Path $dst) { cmd /c rmdir "$dst\node_modules" 2>$null; Remove-Item $dst -Recurse -Force }
robocopy $src $dst /MIR /XD .git node_modules test-results playwright-report /NFL /NDL /NJH /NJS | Out-Null
$nm = Join-Path (Split-Path -Parent $src) 'node_modules'
if (-not (Test-Path $nm)) { $nm = Join-Path $src 'node_modules' }
cmd /c mklink /J "$dst\node_modules" "$nm" | Out-Null
$env:CI = '1'
$env:BUSAN_CI_FIREBASE_ISOLATED = '1'
$env:PLAYWRIGHT_TEST_BASE_URL = 'http://localhost:8080'
Push-Location $dst
try { npx playwright test --project=chromium --retries=0 --reporter=list @TestArgs } finally { Pop-Location }
