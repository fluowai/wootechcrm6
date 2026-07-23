<#
.SYNOPSIS
    Run AI-BOS database migration against Supabase
.DESCRIPTION
    Executes the AIOS schema migration SQL file against your Supabase project.
    You need the SUPABASE_SERVICE_ROLE_KEY and VITE_SUPABASE_URL configured in .env.
.PARAMETER DryRun
    If specified, prints the SQL without executing it.
.PARAMETER Confirm
    If specified, skips the confirmation prompt.
.EXAMPLE
    .\scripts\run-migration.ps1 -Confirm
    .\scripts\run-migration.ps1 -DryRun
#>
param(
    [switch]$DryRun,
    [switch]$Confirm
)

$ErrorActionPreference = "Stop"

# Load .env file
$envFile = Join-Path $PSScriptRoot "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match "^\s*([^#][^=]+)=(.*)$") {
            $name = $matches[1].Trim()
            $value = $matches[2].Trim().Trim('"').Trim("'")
            [Environment]::SetEnvironmentVariable($name, $value, "Process")
        }
    }
}

$supabaseUrl = $env:VITE_SUPABASE_URL
$serviceRoleKey = $env:SUPABASE_SERVICE_ROLE_KEY
$sqlFile = Join-Path $PSScriptRoot "..\DEV\SQL\aios-schema.sql"

# Validate prerequisites
if (-not $supabaseUrl) {
    Write-Error "VITE_SUPABASE_URL not set in .env"
    exit 1
}
if (-not $serviceRoleKey) {
    Write-Error "SUPABASE_SERVICE_ROLE_KEY not set in .env"
    exit 1
}
if (-not (Test-Path $sqlFile)) {
    Write-Error "SQL file not found: $sqlFile"
    exit 1
}

$sqlContent = Get-Content $sqlFile -Raw
$lineCount = ($sqlContent -split "`n").Count

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " AI-BOS Database Migration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Supabase URL: $supabaseUrl"
Write-Host "SQL File:     $sqlFile"
Write-Host "Lines:        $lineCount"
Write-Host ""

if ($DryRun) {
    Write-Host "[DRY RUN] SQL content:" -ForegroundColor Yellow
    Write-Host $sqlContent
    exit 0
}

if (-not $Confirm) {
    $response = Read-Host "Execute migration against Supabase? (y/N)"
    if ($response -ne "y" -and $response -ne "Y") {
        Write-Host "Aborted." -ForegroundColor Red
        exit 0
    }
}

# Execute via Supabase SQL API
Write-Host "Executing migration..." -ForegroundColor Yellow

try {
    $body = @{ query = $sqlContent } | ConvertTo-Json -Depth 10
    $response = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/rpc/exec_sql" `
        -Method POST `
        -Headers @{
        "apikey"        = $serviceRoleKey
        "Authorization" = "Bearer $serviceRoleKey"
        "Content-Type"  = "application/json"
    } `
        -Body $body `
        -TimeoutSec 60

    Write-Host "[OK] Migration executed successfully!" -ForegroundColor Green
} catch {
    Write-Host "[INFO] Direct RPC not available. Trying SQL endpoint..." -ForegroundColor Yellow

    try {
        # Alternative: use Supabase SQL endpoint directly
        $response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/" `
            -Method POST `
            -Headers @{
            "apikey"        = $serviceRoleKey
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type"  = "application/json"
            "Prefer"        = "resolution=merge-duplicates"
        } `
            -Body $sqlContent `
            -TimeoutSec 60

        Write-Host "[OK] Migration executed!" -ForegroundColor Green
    } catch {
        Write-Host "[WARN] Automated execution failed. Please run manually:" -ForegroundColor Yellow
        Write-Host ""
        Write-Host "1. Go to: $supabaseUrl" -ForegroundColor Cyan
        Write-Host "2. Open SQL Editor" -ForegroundColor Cyan
        Write-Host "3. Paste contents of: $sqlFile" -ForegroundColor Cyan
        Write-Host "4. Click 'Run'" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host " Migration Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
