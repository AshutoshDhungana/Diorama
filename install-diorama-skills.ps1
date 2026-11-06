# Installs five skill sets into Claude Code's personal skills folder on Windows.
# Requires: Git and Node.js. Python is needed by pixel-art-studio.
# Run from PowerShell:
#   powershell -ExecutionPolicy Bypass -File .\install-diorama-skills.ps1

$ErrorActionPreference = "Stop"

foreach ($tool in @("git", "npx")) {
    if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
        throw "$tool was not found. Install it, reopen PowerShell, and run this script again."
    }
}

$skillsDir = Join-Path $HOME ".claude\skills"
New-Item -ItemType Directory -Force -Path $skillsDir | Out-Null

$failed = New-Object System.Collections.Generic.List[string]

function Add-NpxSkill {
    param([string]$Repo, [string]$Skill)
    Write-Host "`nInstalling $Skill from $Repo..." -ForegroundColor Cyan
    & npx -y skills add $Repo --skill $Skill --agent claude-code -g -y
    if ($LASTEXITCODE -ne 0) { $failed.Add($Skill) }
}

function Add-ClonedSkill {
    param([string]$Repo, [string]$Name, [string]$SubPath)
    $target = Join-Path $skillsDir $Name
    if (Test-Path $target) {
        Write-Host "`nSkipping $Name because it is already installed." -ForegroundColor Yellow
        return
    }

    Write-Host "`nInstalling $Name from $Repo..." -ForegroundColor Cyan
    $temp = Join-Path ([System.IO.Path]::GetTempPath()) ("skill-" + [guid]::NewGuid())
    try {
        & git clone --depth 1 $Repo $temp
        if ($LASTEXITCODE -ne 0) {
            $failed.Add($Name)
            return
        }

        $source = if ($SubPath) { Join-Path $temp $SubPath } else { $temp }
        if (-not (Test-Path (Join-Path $source "SKILL.md"))) {
            $failed.Add($Name)
            return
        }

        Copy-Item -Recurse -Path $source -Destination $target
        $copiedGit = Join-Path $target ".git"
        if (Test-Path $copiedGit) {
            Remove-Item -Recurse -Force $copiedGit
        }
    }
    finally {
        if (Test-Path $temp) {
            Remove-Item -Recurse -Force $temp -ErrorAction SilentlyContinue
        }
    }
}

# 1. World and collision
Add-NpxSkill "phaserjs/phaser" "tilemaps"

# 2. Isometric geometry and depth sorting
Add-ClonedSkill "https://github.com/0xDarkMatter/claude-mods.git" "isometric-ops" "skills\isometric-ops"

# 3. Controls, pathfinding, camera and game feel
foreach ($skill in @("input-systems", "game-ai", "camera-systems", "game-feel")) {
    Add-NpxSkill "https://github.com/gamedev-skills/awesome-gamedev-agent-skills" $skill
}

# 4. Pixel art and walk cycles
Add-ClonedSkill "https://github.com/Gamezxz/pixel-art-studio.git" "pixel-art-studio" ""

$python = Get-Command python -ErrorAction SilentlyContinue
if ($python) {
    & python -m pip install --user pillow
    if ($LASTEXITCODE -ne 0) { $failed.Add("Pillow for pixel-art-studio") }
}
else {
    Write-Host "`nPython was not found. Install it, then run: python -m pip install pillow" -ForegroundColor Yellow
}

# 5. Browser game testing
Add-NpxSkill "opusgamelabs/game-creator" "game-qa"

Write-Host "`nContents of ${skillsDir}:" -ForegroundColor Cyan
Get-ChildItem $skillsDir | Select-Object -ExpandProperty Name

if ($failed.Count -gt 0) {
    Write-Host "`nThese did not install: $($failed -join ', ')" -ForegroundColor Red
    exit 1
}

Write-Host "`nDone. Start a new Claude Code session to load the skills." -ForegroundColor Green
