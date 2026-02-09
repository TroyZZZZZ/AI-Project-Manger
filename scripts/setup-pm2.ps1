$ErrorActionPreference = "Stop"
$NodeDir = "C:\Users\51184\.trae\binaries\node\versions\22.20.0"
$UserNpmDir = "$env:APPDATA\npm"
$existing = [Environment]::GetEnvironmentVariable("Path","User")
$list = New-Object System.Collections.Generic.List[string]
if ($existing) { $existing.Split(';') | ForEach-Object { if ($_ -and $_.Trim() -ne '') { $list.Add($_) } } }
if (-not $list.Contains($NodeDir)) { $list.Add($NodeDir) }
if (-not $list.Contains($UserNpmDir)) { $list.Add($UserNpmDir) }
$newPath = ($list | Select-Object -Unique) -join ';'
[Environment]::SetEnvironmentVariable("Path", $newPath, "User")
$env:Path = $newPath
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
$NpmCmd = Join-Path $NodeDir "npm.cmd"
$NpxCmd = Join-Path $NodeDir "npx.cmd"
$Pm2Cmd = Join-Path $NodeDir "pm2.cmd"
& $NpmCmd i -g pm2 pm2-windows-service
$admin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")
if (-not $admin) {
  Start-Process -FilePath "powershell" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
  exit
}
& $NpxCmd pm2-service-install -n pm2
$ProjectRoot = Split-Path $PSScriptRoot -Parent
& $Pm2Cmd start (Join-Path $ProjectRoot "scripts\start-frontend.cmd") --name frontend --cwd $ProjectRoot
& $Pm2Cmd start (Join-Path $ProjectRoot "scripts\start-api.cmd") --name backend --cwd $ProjectRoot
& $Pm2Cmd save