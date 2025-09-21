<#!
.SYNOPSIS
  PowerShell helper tasks (Windows alternative to GNU Make)
#>
param(
  [Parameter(Position=0)] [string] $Task = 'help'
)

function Write-Title($text) { Write-Host "`n== $text ==`n" -ForegroundColor Cyan }

function Install {
  Write-Title 'Install runtime deps'
  pip install -r backend/requirements.txt
}
function InstallDev {
  Install
  Write-Title 'Install dev deps'
  pip install -r backend/requirements-dev.txt
}
function Migrate {
  Write-Title 'Migrations'
  pushd backend; python manage.py migrate; popd
}
function RunDev {
  Write-Title 'Run dev server'
  pushd backend; python manage.py runserver 0.0.0.0:8000; popd
}
function FormatCode {
  Write-Title 'Formatting'
  ruff check --fix backend
  black backend
  isort backend
}
function Lint {
  Write-Title 'Lint'
  ruff check backend
  mypy backend || Write-Host 'mypy issues (non-blocking)' -ForegroundColor Yellow
  python backend/manage.py check --deploy || Write-Host 'Deploy check warnings' -ForegroundColor Yellow
}
function Test {
  Write-Title 'Tests'
  pytest -q backend
}
function DevShell {
  pushd backend; python manage.py shell; popd
}
function Help {
  @'
Tasks:
  pwsh -File tasks.ps1 install       # install runtime deps
  pwsh -File tasks.ps1 install-dev   # install + dev deps
  pwsh -File tasks.ps1 migrate       # apply migrations
  pwsh -File tasks.ps1 run           # run dev server
  pwsh -File tasks.ps1 format        # auto-format code
  pwsh -File tasks.ps1 lint          # lint & checks
  pwsh -File tasks.ps1 test          # run tests
  pwsh -File tasks.ps1 shell         # Django shell
'@ | Write-Host
}

switch ($Task) {
  'install' { Install }
  'install-dev' { InstallDev }
  'migrate' { Migrate }
  'run' { RunDev }
  'format' { FormatCode }
  'lint' { Lint }
  'test' { Test }
  'shell' { DevShell }
  default { Help }
}
