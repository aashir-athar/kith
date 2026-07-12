#Requires -Version 5.1
<#
.SYNOPSIS
    Bring up the Kith relay and run the web client, end to end, with one command.

.DESCRIPTION
    Starts the backend (Postgres, Redis, and the Hono relay) via Docker Compose, waits until the
    relay reports healthy, ensures the web client's dependencies and API URL are set, then runs the
    Next.js dev server in the foreground. When you stop the web server, the relay is stopped too
    (its data volume is preserved). The web app and the relay share the same end-to-end encryption,
    so a message sent from the browser opens on the phone and back.

.PARAMETER ApiUrl
    Relay base URL the web client talks to. Default http://localhost:8787.

.PARAMETER Port
    Port for the web dev server. Default 3000.

.PARAMETER WebOnly
    Skip Docker and just run the web client. Assumes a relay is already running at -ApiUrl.

.PARAMETER KeepBackend
    Leave the relay running after the web server stops.

.PARAMETER FreshBackend
    Remove existing relay containers and their data volume before starting (a clean slate).

.PARAMETER SkipInstall
    Skip the npm install checks for shared/ and web/.

.EXAMPLE
    .\run-all.ps1
    Start the relay and the web client, then open http://localhost:3000.

.EXAMPLE
    .\run-all.ps1 -FreshBackend
    Wipe the local database first, then start everything.

.EXAMPLE
    .\run-all.ps1 -WebOnly
    Just run the web client against a relay that is already up.
#>
[CmdletBinding()]
param(
    [string]$ApiUrl = 'http://localhost:8787',
    [int]$Port = 3000,
    [switch]$WebOnly,
    [switch]$KeepBackend,
    [switch]$FreshBackend,
    [switch]$SkipInstall
)

$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$serverDir = Join-Path $root 'server'
$webDir = Join-Path $root 'web'
$sharedDir = Join-Path $root 'shared'

function Info($m) { Write-Host "[kith] $m" -ForegroundColor Cyan }
function Warn($m) { Write-Host "[kith] $m" -ForegroundColor Yellow }
function Die($m) { Write-Host "[kith] $m" -ForegroundColor Red; exit 1 }

function Need($cmd, $hint) {
    if (-not (Get-Command $cmd -ErrorAction SilentlyContinue)) { Die "'$cmd' not found. $hint" }
}

function Test-Health($url, $timeoutSec) {
    $deadline = (Get-Date).AddSeconds($timeoutSec)
    while ((Get-Date) -lt $deadline) {
        try {
            $r = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 3
            if ($r.StatusCode -eq 200) { return $true }
        } catch {
            # not up yet; keep polling
        }
        Write-Host '.' -NoNewline
        Start-Sleep -Seconds 2
    }
    return $false
}

function Invoke-Npm($dir, $label) {
    Push-Location $dir
    try {
        & npm install
        if ($LASTEXITCODE -ne 0) { Die "npm install failed in $label." }
    } finally {
        Pop-Location
    }
}

# --- preflight --------------------------------------------------------------
Need 'node' 'Install Node 20 or newer from https://nodejs.org'
Need 'npm'  'npm ships with Node; install Node 20 or newer.'

$healthUrl = ($ApiUrl.TrimEnd('/')) + '/health'
$backendStarted = $false

# --- backend ----------------------------------------------------------------
if (-not $WebOnly) {
    Need 'docker' 'Install Docker Desktop from https://www.docker.com/products/docker-desktop'

    & docker info *> $null
    if ($LASTEXITCODE -ne 0) {
        Die 'Docker is installed but the daemon is not running. Start Docker Desktop and retry.'
    }

    & docker compose version *> $null
    if ($LASTEXITCODE -ne 0) {
        Die 'Docker Compose v2 is required (the "docker compose" subcommand). Update Docker Desktop, or run the steps in server/README.md by hand.'
    }

    Push-Location $serverDir
    try {
        if ($FreshBackend) {
            Info 'Removing existing relay containers and data volume (-FreshBackend)...'
            & docker compose down -v
        }
        Info 'Starting the relay (Postgres, Redis, Hono). The first run builds the image and can take a few minutes...'
        & docker compose up -d --build
        if ($LASTEXITCODE -ne 0) { Die 'docker compose failed to start the relay. See the output above.' }
    } finally {
        Pop-Location
    }
    $backendStarted = $true

    Info "Waiting for the relay at $healthUrl"
    if (-not (Test-Health $healthUrl 300)) {
        Write-Host ''
        Warn 'The relay did not become healthy in time. Recent server logs:'
        Push-Location $serverDir
        try { & docker compose logs --tail 60 server } finally { Pop-Location }
        Warn 'The relay containers are left running so you can inspect them.'
        Die 'Relay health check failed. Fix the backend, then retry (or use -WebOnly once it is up).'
    }
    Write-Host ''
    Info 'Relay is healthy.'
} else {
    Info 'WebOnly: skipping Docker and assuming a relay is already running.'
    if (-not (Test-Health $healthUrl 5)) {
        Write-Host ''
        Warn "No relay responded at $healthUrl. The web app will load, but sign-in fails until the relay is up."
    } else {
        Write-Host ''
    }
}

# --- web dependencies -------------------------------------------------------
if (-not $SkipInstall) {
    if (-not (Test-Path (Join-Path $sharedDir 'node_modules'))) {
        Info 'Installing @kith/shared dependencies...'
        Invoke-Npm $sharedDir 'shared/'
    }
    if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
        Info 'Installing web client dependencies...'
        Invoke-Npm $webDir 'web/'
    }
}

# --- web env ----------------------------------------------------------------
# Write .env.local without a BOM. A UTF-8 BOM would attach to the first key and break the API URL.
$envFile = Join-Path $webDir '.env.local'
$envLine = "NEXT_PUBLIC_API_URL=$ApiUrl"
if (-not (Test-Path $envFile)) {
    Info "Writing web/.env.local ($envLine)"
    [System.IO.File]::WriteAllText($envFile, $envLine + "`n")
} else {
    $existing = [System.IO.File]::ReadAllText($envFile)
    if ($existing -notmatch 'NEXT_PUBLIC_API_URL') {
        Info 'Adding NEXT_PUBLIC_API_URL to your existing web/.env.local'
        # Guarantee the key lands on its own line even if the file had no trailing newline,
        # and stay UTF-8 no-BOM so the first key is never corrupted.
        $prefix = ''
        if ($existing.Length -gt 0 -and -not $existing.EndsWith("`n")) { $prefix = "`n" }
        [System.IO.File]::AppendAllText($envFile, $prefix + $envLine + "`n", (New-Object System.Text.UTF8Encoding($false)))
    } elseif ($existing -notmatch [regex]::Escape($envLine)) {
        Warn "web/.env.local already points NEXT_PUBLIC_API_URL somewhere other than $ApiUrl. Leaving it as-is."
    }
}

# --- run the web client (foreground) ----------------------------------------
Write-Host ''
Info "Web client:  http://localhost:$Port"
Info "Relay:       $ApiUrl"
if ($backendStarted) {
    Info "Relay logs:  docker compose -f server/docker-compose.yml logs -f server"
}
Info 'Press Ctrl+C to stop.'
Write-Host ''

Push-Location $webDir
try {
    & npm run dev -- --port $Port
} finally {
    Pop-Location
    if ($backendStarted -and -not $KeepBackend) {
        Info 'Stopping the relay (its data is preserved).'
        Push-Location $serverDir
        try { & docker compose stop *> $null } catch { } finally { Pop-Location }
        # If Ctrl+C interrupted this cleanup, the relay may still be up; tell the user how to stop it.
        Info 'If the relay is still running, stop it with: docker compose -f server/docker-compose.yml stop'
    } elseif ($backendStarted -and $KeepBackend) {
        Info 'Leaving the relay running (-KeepBackend). Stop it with: docker compose -f server/docker-compose.yml stop'
    }
}
