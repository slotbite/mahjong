# Servidor estático de vista previa para compartir por wifi.
# Uso: powershell -ExecutionPolicy Bypass -File tools/serve.ps1 [-Port 8080]
param([int]$Port = 8080)

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$ips = Get-NetIPAddress -AddressFamily IPv4 |
  Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' } |
  Select-Object -ExpandProperty IPAddress

Write-Host ""
Write-Host "Memorice Cozy - vista previa" -ForegroundColor Green
Write-Host "  Local:  http://localhost:$Port/"
foreach ($ip in $ips) { Write-Host "  Wifi:   http://${ip}:$Port/" -ForegroundColor Cyan }
Write-Host "  Pixelador dev: /tools/pixelator.html"
Write-Host "  (Ctrl+C para detener)"
Write-Host ""

Set-Location $root
if (Get-Command python -ErrorAction SilentlyContinue) {
  # Servidor propio sin cache: el http.server estandar deja que el navegador reutilice los modulos JS viejos.
  python tools/serve.py $Port
} elseif (Get-Command npx -ErrorAction SilentlyContinue) {
  npx --yes serve -l tcp://0.0.0.0:$Port .
} else {
  Write-Error "Se necesita python o node para servir la vista previa."
}
