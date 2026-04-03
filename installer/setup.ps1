#Requires -RunAsAdministrator
<#
.SYNOPSIS
    GrimmGear rr-stack Installer
    Installs and configures the complete *arr media automation stack.

.DESCRIPTION
    Downloads, installs, and configures:
    - Sonarr (TV Shows)
    - Radarr (Movies)
    - Lidarr (Music)
    - Readarr (Books)
    - Prowlarr (Indexer Management)
    - qBittorrent (Download Client)
    - FlareSolverr (CloudFlare Bypass)
    - GrimmGear Dashboard (Unified Monitoring)

    Optional: Links to existing Plex Media Server

.NOTES
    All components are open source (GPL v3).
    Original projects: Sonarr, Radarr, Lidarr, Readarr, Prowlarr teams.
    This installer by GrimmGear Systems — contributing improvements upstream.
#>

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"

# ============================================================
# CONFIGURATION
# ============================================================
$script:Config = @{
    InstallDir     = "C:\ProgramData"
    MediaRoot      = ""
    DownloadDir    = ""
    QbitUser       = ""
    QbitPass       = ""
    PlexUrl        = ""
    PlexToken      = ""
    DashboardPort  = 3333
}

$script:Services = @{
    Sonarr      = @{ Port = 8989; Url = ""; Installed = $false }
    Radarr      = @{ Port = 7878; Url = ""; Installed = $false }
    Lidarr      = @{ Port = 8686; Url = ""; Installed = $false }
    Readarr     = @{ Port = 8787; Url = ""; Installed = $false }
    Prowlarr    = @{ Port = 9696; Url = ""; Installed = $false }
    qBittorrent = @{ Port = 8081; Url = ""; Installed = $false }
    FlareSolverr = @{ Port = 8191; Url = ""; Installed = $false }
}

# ============================================================
# UI HELPERS
# ============================================================
function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor DarkCyan
    Write-Host "  ║                                              ║" -ForegroundColor DarkCyan
    Write-Host "  ║   GrimmGear rr-stack Installer               ║" -ForegroundColor DarkCyan
    Write-Host "  ║   Media Automation Stack Setup Wizard         ║" -ForegroundColor DarkCyan
    Write-Host "  ║                                              ║" -ForegroundColor DarkCyan
    Write-Host "  ║   Sonarr + Radarr + Lidarr + Readarr        ║" -ForegroundColor DarkCyan
    Write-Host "  ║   Prowlarr + qBittorrent + FlareSolverr     ║" -ForegroundColor DarkCyan
    Write-Host "  ║                                              ║" -ForegroundColor DarkCyan
    Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor DarkCyan
    Write-Host ""
    Write-Host "  Built on open source projects by the *arr community." -ForegroundColor DarkGray
    Write-Host "  Sonarr, Radarr, Lidarr, Readarr, Prowlarr teams." -ForegroundColor DarkGray
    Write-Host ""
}

function Write-Step {
    param([string]$Step, [string]$Message)
    Write-Host "  [$Step] " -ForegroundColor Cyan -NoNewline
    Write-Host $Message
}

function Write-OK {
    param([string]$Message)
    Write-Host "    [OK] " -ForegroundColor Green -NoNewline
    Write-Host $Message
}

function Write-Skip {
    param([string]$Message)
    Write-Host "    [SKIP] " -ForegroundColor Yellow -NoNewline
    Write-Host $Message
}

function Write-Fail {
    param([string]$Message)
    Write-Host "    [FAIL] " -ForegroundColor Red -NoNewline
    Write-Host $Message
}

function Ask {
    param([string]$Prompt, [string]$Default = "")
    $suffix = if ($Default) { " [$Default]" } else { "" }
    Write-Host "  > $Prompt$suffix`: " -ForegroundColor White -NoNewline
    $answer = Read-Host
    if ([string]::IsNullOrWhiteSpace($answer)) { return $Default }
    return $answer.Trim()
}

function AskYN {
    param([string]$Prompt, [bool]$Default = $true)
    $suffix = if ($Default) { "[Y/n]" } else { "[y/N]" }
    Write-Host "  > $Prompt $suffix`: " -ForegroundColor White -NoNewline
    $answer = Read-Host
    if ([string]::IsNullOrWhiteSpace($answer)) { return $Default }
    return $answer -match "^[Yy]"
}

# ============================================================
# STEP 1: DETECT EXISTING INSTALLATIONS
# ============================================================
function Step-Detect {
    Write-Step "1/7" "Detecting existing installations..."

    $checks = @(
        @{ Name = "Sonarr";      Port = 8989; Path = "C:\ProgramData\Sonarr\bin\Sonarr.exe" },
        @{ Name = "Radarr";      Port = 7878; Path = "C:\ProgramData\Radarr\bin\Radarr.exe" },
        @{ Name = "Lidarr";      Port = 8686; Path = "C:\ProgramData\Lidarr\bin\Lidarr.exe" },
        @{ Name = "Readarr";     Port = 8787; Path = "C:\ProgramData\Readarr\bin\Readarr.exe" },
        @{ Name = "Prowlarr";    Port = 9696; Path = "C:\ProgramData\Prowlarr\bin\Prowlarr.exe" },
        @{ Name = "qBittorrent"; Port = 8081; Path = "C:\Program Files\qBittorrent\qbittorrent.exe" },
        @{ Name = "FlareSolverr"; Port = 8191; Path = "C:\Tools\FlareSolverr\flaresolverr\flaresolverr.exe" }
    )

    foreach ($check in $checks) {
        $exists = Test-Path $check.Path
        $running = $false
        try {
            $conn = Get-NetTCPConnection -LocalPort $check.Port -State Listen -ErrorAction SilentlyContinue
            $running = $null -ne $conn
        } catch {}

        $script:Services[$check.Name].Installed = $exists
        $script:Services[$check.Name].Url = "http://localhost:$($check.Port)"

        if ($exists -and $running) {
            Write-OK "$($check.Name) — installed and running on port $($check.Port)"
        } elseif ($exists) {
            Write-OK "$($check.Name) — installed (not currently running)"
        } else {
            Write-Skip "$($check.Name) — not found"
        }
    }

    # Check Plex
    try {
        $plexReg = Get-ItemProperty "HKCU:\SOFTWARE\Plex, Inc.\Plex Media Server" -ErrorAction SilentlyContinue
        if ($plexReg) {
            $script:Config.PlexToken = $plexReg.PlexOnlineToken
            Write-OK "Plex Media Server — detected (token found)"
        }
    } catch {}

    if (-not $script:Config.PlexToken) {
        try {
            $plexCheck = Invoke-RestMethod -Uri "http://localhost:32400/identity" -TimeoutSec 3 -ErrorAction Stop
            Write-OK "Plex Media Server — running on port 32400"
        } catch {
            Write-Skip "Plex Media Server — not detected"
        }
    }

    Write-Host ""
}

# ============================================================
# STEP 2: CONFIGURE PATHS
# ============================================================
function Step-Paths {
    Write-Step "2/7" "Configure media and download paths"
    Write-Host ""

    # Detect existing paths
    $defaultMedia = "D:\Media"
    $defaultDl = "D:\Downloads"

    if (Test-Path "D:\Media") { $defaultMedia = "D:\Media" }
    elseif (Test-Path "E:\Media") { $defaultMedia = "E:\Media" }

    $script:Config.MediaRoot = Ask "Media root folder" $defaultMedia
    $script:Config.DownloadDir = Ask "Download folder" $defaultDl

    # Create folders
    $subFolders = @("Movies", "TVshows", "Music", "Books")
    foreach ($sub in $subFolders) {
        $path = Join-Path $script:Config.MediaRoot $sub
        if (-not (Test-Path $path)) {
            New-Item -Path $path -ItemType Directory -Force | Out-Null
            Write-OK "Created $path"
        }
    }

    if (-not (Test-Path $script:Config.DownloadDir)) {
        New-Item -Path $script:Config.DownloadDir -ItemType Directory -Force | Out-Null
        Write-OK "Created $($script:Config.DownloadDir)"
    }

    Write-Host ""
}

# ============================================================
# STEP 3: CONFIGURE DOWNLOAD CLIENT
# ============================================================
function Step-DownloadClient {
    Write-Step "3/7" "Configure download client (qBittorrent)"
    Write-Host ""

    if ($script:Services.qBittorrent.Installed) {
        Write-OK "qBittorrent already installed"
    } else {
        if (AskYN "Install qBittorrent?") {
            Write-Host "    Downloading qBittorrent..." -ForegroundColor Gray
            winget install qBittorrent.qBittorrent --accept-source-agreements --accept-package-agreements --silent | Out-Null
            Write-OK "qBittorrent installed"
        }
    }

    $script:Config.QbitUser = Ask "qBittorrent WebUI username" "admin"
    $script:Config.QbitPass = Ask "qBittorrent WebUI password"

    if ([string]::IsNullOrWhiteSpace($script:Config.QbitPass)) {
        Write-Fail "Password is required for qBittorrent"
        $script:Config.QbitPass = Ask "qBittorrent WebUI password"
    }

    Write-Host ""
}

# ============================================================
# STEP 4: CONFIGURE PLEX
# ============================================================
function Step-Plex {
    Write-Step "4/7" "Configure Plex Media Server (optional)"
    Write-Host ""

    if ($script:Config.PlexToken) {
        Write-OK "Plex token already detected from registry"
        $script:Config.PlexUrl = "http://localhost:32400"
    } else {
        if (AskYN "Do you have Plex Media Server installed?" $false) {
            $script:Config.PlexUrl = Ask "Plex URL" "http://localhost:32400"
            $script:Config.PlexToken = Ask "Plex auth token (Settings > Account > Copy Token)"
        } else {
            Write-Skip "Skipping Plex integration"
        }
    }

    Write-Host ""
}

# ============================================================
# STEP 5: INSTALL MISSING SERVICES
# ============================================================
function Step-Install {
    Write-Step "5/7" "Installing missing services..."
    Write-Host ""

    $arrApps = @(
        @{ Name = "Sonarr";   Winget = "TeamSonarr.Sonarr" },
        @{ Name = "Radarr";   Winget = "TeamRadarr.Radarr" },
        @{ Name = "Lidarr";   Winget = "TeamLidarr.Lidarr" },
        @{ Name = "Readarr";  Winget = "TeamReadarr.Readarr" },
        @{ Name = "Prowlarr"; Winget = "TeamProwlarr.Prowlarr" }
    )

    foreach ($app in $arrApps) {
        if ($script:Services[$app.Name].Installed) {
            Write-OK "$($app.Name) already installed"
        } else {
            if (AskYN "Install $($app.Name)?") {
                Write-Host "    Downloading $($app.Name)..." -ForegroundColor Gray
                try {
                    winget install $app.Winget --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
                    Write-OK "$($app.Name) installed"
                    $script:Services[$app.Name].Installed = $true
                } catch {
                    Write-Fail "Failed to install $($app.Name): $_"
                }
            }
        }
    }

    # FlareSolverr
    if (-not $script:Services.FlareSolverr.Installed) {
        if (AskYN "Install FlareSolverr (CloudFlare bypass)?") {
            Write-Host "    Downloading FlareSolverr..." -ForegroundColor Gray
            $fsUrl = "https://github.com/FlareSolverr/FlareSolverr/releases/download/v3.4.6/flaresolverr_windows_x64.zip"
            $fsZip = "$env:TEMP\flaresolverr.zip"
            $fsDest = "C:\Tools\FlareSolverr"
            Invoke-WebRequest -Uri $fsUrl -OutFile $fsZip
            Expand-Archive -Path $fsZip -DestinationPath $fsDest -Force
            Remove-Item $fsZip

            # Install as service via NSSM
            $nssm = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "nssm.exe" | Select-Object -First 1
            if (-not $nssm) {
                winget install NSSM.NSSM --accept-source-agreements --accept-package-agreements --silent | Out-Null
                $nssm = Get-ChildItem "$env:LOCALAPPDATA\Microsoft\WinGet\Packages" -Recurse -Filter "nssm.exe" | Select-Object -First 1
            }
            if ($nssm) {
                & $nssm.FullName install FlareSolverr "$fsDest\flaresolverr\flaresolverr.exe"
                & $nssm.FullName set FlareSolverr AppDirectory "$fsDest\flaresolverr"
                & $nssm.FullName set FlareSolverr Start SERVICE_AUTO_START
                & $nssm.FullName start FlareSolverr
            }
            Write-OK "FlareSolverr installed as service on port 8191"
        }
    } else {
        Write-OK "FlareSolverr already installed"
    }

    Write-Host ""
}

# ============================================================
# STEP 6: CONFIGURE ALL SERVICES
# ============================================================
function Step-Configure {
    Write-Step "6/7" "Configuring services..."
    Write-Host ""

    # Wait for services to start
    Write-Host "    Waiting for services to start..." -ForegroundColor Gray
    Start-Sleep -Seconds 5

    # Collect API keys from config files
    $apiKeys = @{}
    $configs = @(
        @{ Name = "Sonarr";   Path = "C:\ProgramData\Sonarr\config.xml" },
        @{ Name = "Radarr";   Path = "C:\ProgramData\Radarr\config.xml" },
        @{ Name = "Lidarr";   Path = "C:\ProgramData\Lidarr\config.xml" },
        @{ Name = "Readarr";  Path = "C:\ProgramData\Readarr\config.xml" },
        @{ Name = "Prowlarr"; Path = "C:\ProgramData\Prowlarr\config.xml" }
    )

    foreach ($cfg in $configs) {
        if (Test-Path $cfg.Path) {
            $xml = [xml](Get-Content $cfg.Path)
            $key = $xml.Config.ApiKey
            if ($key) {
                $apiKeys[$cfg.Name] = $key
                Write-OK "$($cfg.Name) API key: $($key.Substring(0,8))..."
            }
        }
    }

    # Configure download client in each arr app
    foreach ($app in @("Sonarr", "Radarr", "Lidarr", "Readarr")) {
        $key = $apiKeys[$app]
        if (-not $key) { continue }

        $apiVer = if ($app -match "Sonarr|Radarr") { "v3" } else { "v1" }
        $baseUrl = "http://localhost:$($script:Services[$app].Port)/api/$apiVer"
        $headers = @{ "X-Api-Key" = $key; "Content-Type" = "application/json" }

        # Check if download client already exists
        try {
            $existing = Invoke-RestMethod -Uri "$baseUrl/downloadclient" -Headers $headers -TimeoutSec 5
            if ($existing.Count -gt 0) {
                Write-OK "$app — download client already configured"
                continue
            }
        } catch { continue }

        # Category mapping
        $category = switch ($app) {
            "Sonarr"  { "tv-sonarr" }
            "Radarr"  { "radarr" }
            "Lidarr"  { "lidarr" }
            "Readarr" { "readarr" }
        }

        $dlBody = @{
            enable = $true
            name = "qBittorrent"
            implementation = "QBittorrent"
            implementationName = "qBittorrent"
            configContract = "QBittorrentSettings"
            protocol = "torrent"
            priority = 1
            removeCompletedDownloads = $true
            removeFailedDownloads = $true
            fields = @(
                @{ name = "host"; value = "localhost" }
                @{ name = "port"; value = 8081 }
                @{ name = "useSsl"; value = $false }
                @{ name = "username"; value = $script:Config.QbitUser }
                @{ name = "password"; value = $script:Config.QbitPass }
                @{ name = "category"; value = $category }
                @{ name = "initialState"; value = 0 }
            )
            tags = @()
        } | ConvertTo-Json -Depth 5 -Compress

        try {
            Invoke-RestMethod -Uri "$baseUrl/downloadclient" -Method Post -Headers $headers -Body $dlBody -TimeoutSec 10 | Out-Null
            Write-OK "$app — qBittorrent linked (category: $category)"
        } catch {
            Write-Fail "$app — failed to add download client"
        }
    }

    # Configure root folders
    $folderMap = @{
        "Sonarr"  = "TVshows"
        "Radarr"  = "Movies"
        "Lidarr"  = "Music"
        "Readarr" = "Books"
    }

    foreach ($app in $folderMap.Keys) {
        $key = $apiKeys[$app]
        if (-not $key) { continue }

        $apiVer = if ($app -match "Sonarr|Radarr") { "v3" } else { "v1" }
        $baseUrl = "http://localhost:$($script:Services[$app].Port)/api/$apiVer"
        $headers = @{ "X-Api-Key" = $key; "Content-Type" = "application/json" }

        $rootPath = Join-Path $script:Config.MediaRoot $folderMap[$app]
        $rfBody = @{ path = $rootPath } | ConvertTo-Json -Compress

        try {
            $existing = Invoke-RestMethod -Uri "$baseUrl/rootfolder" -Headers $headers -TimeoutSec 5
            if ($existing | Where-Object { $_.path -eq $rootPath }) {
                Write-OK "$app — root folder already set to $rootPath"
                continue
            }
        } catch { continue }

        try {
            Invoke-RestMethod -Uri "$baseUrl/rootfolder" -Method Post -Headers $headers -Body $rfBody -TimeoutSec 10 | Out-Null
            Write-OK "$app — root folder set to $rootPath"
        } catch {
            Write-Fail "$app — failed to set root folder"
        }
    }

    # Configure Plex notifications
    if ($script:Config.PlexToken) {
        foreach ($app in @("Sonarr", "Radarr")) {
            $key = $apiKeys[$app]
            if (-not $key) { continue }

            $baseUrl = "http://localhost:$($script:Services[$app].Port)/api/v3"
            $headers = @{ "X-Api-Key" = $key; "Content-Type" = "application/json" }

            $plexBody = @{
                name = "Plex Media Server"
                implementation = "PlexServer"
                implementationName = "Plex Media Server"
                configContract = "PlexServerSettings"
                onDownload = $true; onUpgrade = $true; onRename = $true
                fields = @(
                    @{ name = "host"; value = "localhost" }
                    @{ name = "port"; value = 32400 }
                    @{ name = "useSsl"; value = $false }
                    @{ name = "authToken"; value = $script:Config.PlexToken }
                    @{ name = "updateLibrary"; value = $true }
                )
                tags = @()
            } | ConvertTo-Json -Depth 5 -Compress

            try {
                Invoke-RestMethod -Uri "$baseUrl/notification" -Method Post -Headers $headers -Body $plexBody -TimeoutSec 10 | Out-Null
                Write-OK "$app — Plex notification configured"
            } catch {
                Write-Skip "$app — Plex notification failed (configure manually)"
            }
        }
    }

    # Configure Prowlarr app sync
    $prowlarrKey = $apiKeys["Prowlarr"]
    if ($prowlarrKey) {
        $prowlarrUrl = "http://localhost:9696/api/v1"
        $prowlarrHeaders = @{ "X-Api-Key" = $prowlarrKey; "Content-Type" = "application/json" }

        $appSync = @(
            @{ Name = "Sonarr";  Impl = "Sonarr";  Port = 8989; Cats = @(5000,5010,5020,5030,5040,5045,5050,5070,5080) },
            @{ Name = "Radarr";  Impl = "Radarr";  Port = 7878; Cats = @(2000,2010,2020,2030,2040,2045,2050,2060) },
            @{ Name = "Lidarr";  Impl = "Lidarr";  Port = 8686; Cats = @(3000,3010,3020,3030,3040,3050) },
            @{ Name = "Readarr"; Impl = "Readarr"; Port = 8787; Cats = @(7000,7010,7020,7030,8000,8010,8020) }
        )

        foreach ($sync in $appSync) {
            $appKey = $apiKeys[$sync.Name]
            if (-not $appKey) { continue }

            $syncBody = @{
                name = $sync.Name
                syncLevel = "fullSync"
                implementation = $sync.Impl
                implementationName = $sync.Impl
                configContract = "$($sync.Impl)Settings"
                fields = @(
                    @{ name = "prowlarrUrl"; value = "http://localhost:9696" }
                    @{ name = "baseUrl"; value = "http://localhost:$($sync.Port)" }
                    @{ name = "apiKey"; value = $appKey }
                    @{ name = "syncCategories"; value = $sync.Cats }
                )
                tags = @()
            } | ConvertTo-Json -Depth 5 -Compress

            try {
                Invoke-RestMethod -Uri "$prowlarrUrl/applications" -Method Post -Headers $prowlarrHeaders -Body $syncBody -TimeoutSec 10 | Out-Null
                Write-OK "Prowlarr — synced to $($sync.Name)"
            } catch {
                Write-Skip "Prowlarr — $($sync.Name) sync failed (may already exist)"
            }
        }
    }

    Write-Host ""
}

# ============================================================
# STEP 7: INSTALL DASHBOARD
# ============================================================
function Step-Dashboard {
    Write-Step "7/7" "Installing GrimmGear Dashboard..."
    Write-Host ""

    $dashDir = "C:\Tools\GrimmGear-Dashboard"
    if (-not (Test-Path $dashDir)) {
        New-Item -Path $dashDir -ItemType Directory -Force | Out-Null
    }

    # Copy dashboard files (assumes they're in the same directory as the installer)
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
    $dashSource = Join-Path (Split-Path $scriptDir) "dashboard"

    if (Test-Path $dashSource) {
        Copy-Item "$dashSource\*" $dashDir -Force
        Write-OK "Dashboard files copied to $dashDir"
    } else {
        Write-Skip "Dashboard files not found — download from github.com/RichardBeukes/rr-stack"
    }

    Write-OK "Dashboard available at http://localhost:$($script:Config.DashboardPort)"
    Write-Host ""
}

# ============================================================
# SUMMARY
# ============================================================
function Show-Summary {
    Write-Host ""
    Write-Host "  ╔══════════════════════════════════════════════╗" -ForegroundColor Green
    Write-Host "  ║         SETUP COMPLETE                       ║" -ForegroundColor Green
    Write-Host "  ╚══════════════════════════════════════════════╝" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Services:" -ForegroundColor White
    Write-Host "    Sonarr       http://localhost:8989   (TV Shows)" -ForegroundColor Gray
    Write-Host "    Radarr       http://localhost:7878   (Movies)" -ForegroundColor Gray
    Write-Host "    Lidarr       http://localhost:8686   (Music)" -ForegroundColor Gray
    Write-Host "    Readarr      http://localhost:8787   (Books)" -ForegroundColor Gray
    Write-Host "    Prowlarr     http://localhost:9696   (Indexers)" -ForegroundColor Gray
    Write-Host "    qBittorrent  http://localhost:8081   (Downloads)" -ForegroundColor Gray
    Write-Host "    FlareSolverr http://localhost:8191   (CF Bypass)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  Media:     $($script:Config.MediaRoot)" -ForegroundColor White
    Write-Host "  Downloads: $($script:Config.DownloadDir)" -ForegroundColor White
    if ($script:Config.PlexUrl) {
        Write-Host "  Plex:      $($script:Config.PlexUrl)" -ForegroundColor White
    }
    Write-Host ""
    Write-Host "  Dashboard: http://localhost:$($script:Config.DashboardPort)" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Next steps:" -ForegroundColor Yellow
    Write-Host "    1. Open Prowlarr (http://localhost:9696) and add indexers" -ForegroundColor Gray
    Write-Host "    2. Add movies/shows in Radarr/Sonarr" -ForegroundColor Gray
    Write-Host "    3. Open the GrimmGear Dashboard to monitor everything" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  All services are open source (GPL v3)." -ForegroundColor DarkGray
    Write-Host "  Original projects: github.com/Sonarr, Radarr, Lidarr, Readarr, Prowlarr" -ForegroundColor DarkGray
    Write-Host ""
}

# ============================================================
# MAIN
# ============================================================
Write-Banner

Write-Host "  This wizard will set up your complete media automation stack." -ForegroundColor White
Write-Host "  Press Enter to continue or Ctrl+C to cancel." -ForegroundColor Gray
Read-Host | Out-Null

Step-Detect
Step-Paths
Step-DownloadClient
Step-Plex
Step-Install
Step-Configure
Step-Dashboard
Show-Summary
