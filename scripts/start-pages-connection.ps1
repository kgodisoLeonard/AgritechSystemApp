$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$runtimeDirectory = Join-Path $projectRoot '.pages-runtime'
New-Item -ItemType Directory -Path $runtimeDirectory -Force | Out-Null
$tunnelBinary = Join-Path $runtimeDirectory 'cloudflared.exe'
if (-not (Test-Path -LiteralPath $tunnelBinary)) {
    throw 'Install cloudflared.exe in .pages-runtime before starting the Pages connection.'
}
$nodeExecutable = (Get-Command node.exe).Source
$env:ENABLE_DATA_API = 'true'
try {
    Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:8787/node/api/health' -TimeoutSec 5 | Out-Null
} catch {
    Start-Process -FilePath $nodeExecutable -ArgumentList @('scripts/pages-api-proxy.mjs') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'proxy-out.log') -RedirectStandardError (Join-Path $runtimeDirectory 'proxy-error.log')
}
$monitorRunning = $false
$pidFile = Join-Path $runtimeDirectory 'supervisor.pid'
if (Test-Path -LiteralPath $pidFile) {
    $monitorProcessId = [int](Get-Content -LiteralPath $pidFile)
    $monitorRunning = $null -ne (Get-Process -Id $monitorProcessId -ErrorAction SilentlyContinue)
}
if (-not $monitorRunning) {
    Start-Process -FilePath $nodeExecutable -ArgumentList @('scripts/maintain-pages-connection.mjs') -WorkingDirectory $projectRoot -WindowStyle Hidden -RedirectStandardOutput (Join-Path $runtimeDirectory 'monitor-out.log') -RedirectStandardError (Join-Path $runtimeDirectory 'monitor-error.log')
}
