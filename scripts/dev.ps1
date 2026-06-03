param(
  [string]$Distro = "Ubuntu",
  [string]$ProjectPath = "/home/hermes/projects/pixel-pal-web",
  [string]$WslUser = "hermes"
)

$ErrorActionPreference = "Stop"

$wslCommand = @"
export PATH="/home/$WslUser/.n/bin:/home/$WslUser/.npm-global/bin:/usr/bin:/bin"
cd '$ProjectPath' && bash scripts/dev.sh
"@

Write-Host "启动 PixelPal 开发环境 (WSL/$Distro)..." -ForegroundColor Cyan
Write-Host "Web: http://127.0.0.1:5173/" -ForegroundColor Green

wsl -d $Distro -- env "HOME=/home/$WslUser" "DISPLAY=:0" bash --noprofile --norc -c $wslCommand
