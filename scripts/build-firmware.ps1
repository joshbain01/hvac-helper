# HVAC Helper Pro: Firmware Build & Flash Automation Script
# Usage: 
#   .\scripts\build-firmware.ps1 build
#   .\scripts\build-firmware.ps1 flash -Port COM3
#   .\scripts\build-firmware.ps1 all -Port COM3

param(
    [Parameter(Position=0, Mandatory=$true)]
    [ValidateSet("build", "flash", "all", "clean")]
    [string]$Action,

    [Parameter(Mandatory=$false)]
    [string]$Port = "COM3"
)

$ErrorActionPreference = "Stop"
$FirmwareDir = Join-Path $PSScriptRoot "..\firmware"
$PartitionLimitBytes = 1572864 # 1.5MB limit in bytes

Write-Host "=== HVAC Helper Pro: Firmware Tooling ===" -ForegroundColor Cyan

# 1. Environment Verification
function Verify-Environment {
    Write-Host "Checking ESP-IDF environment..." -ForegroundColor Gray
    
    # Check if idf.py is on PATH
    $IdfPath = Get-Command idf.py -ErrorAction SilentlyContinue
    if (-not $IdfPath) {
        if ($env:IDF_PATH) {
            $ExportScript = Join-Path $env:IDF_PATH "export.ps1"
            if (Test-Path $ExportScript) {
                Write-Host "Found IDF_PATH, sourcing export.ps1..." -ForegroundColor Yellow
                . $ExportScript
            } else {
                Write-Error "IDF_PATH is set but export.ps1 was not found at: $ExportScript"
            }
        } else {
            Write-Error "idf.py is not in PATH, and env variable IDF_PATH is not set. Please run the ESP-IDF Command Prompt or install ESP-IDF first."
        }
    }
}

# 2. Execute Build
function Run-Build {
    Write-Host "Starting ESP-IDF build process..." -ForegroundColor Green
    
    # Save current location and switch to firmware directory
    $OrigLocation = Get-Location
    Set-Location $FirmwareDir
    
    try {
        # Run idf.py build
        idf.py build
        
        # Verify compiled bin exists and check its size
        $BinPath = Join-Path $FirmwareDir "build\hvac-helper-firmware.bin"
        if (Test-Path $BinPath) {
            $BinSize = (Get-Item $BinPath).Length
            $BinSizeKB = [Math]::Round($BinSize / 1024, 2)
            
            Write-Host "--------------------------------------------------" -ForegroundColor Cyan
            Write-Host "Build Complete!" -ForegroundColor Green
            Write-Host "Binary: $BinPath" -ForegroundColor Gray
            Write-Host "Compiled Size: $BinSizeKB KB ($BinSize bytes)" -ForegroundColor White
            
            if ($BinSize -gt $PartitionLimitBytes) {
                Write-Host "WARNING: Compiled binary size ($BinSizeKB KB) EXCEEDS the 1.5MB (1536 KB) OTA application partition limit!" -ForegroundColor Red
                Write-Host "Action Required: Optimize binary or reduce enabled NimBLE features in sdkconfig." -ForegroundColor Yellow
            } else {
                $Remaining = [Math]::Round(($PartitionLimitBytes - $BinSize) / 1024, 2)
                Write-Host "SUCCESS: Binary fits within 1.5MB limit. Free partition space: $Remaining KB." -ForegroundColor Green
            }
            Write-Host "--------------------------------------------------" -ForegroundColor Cyan
        } else {
            Write-Error "Build succeeded but output binary not found at $BinPath"
        }
    }
    finally {
        # Restore location
        Set-Location $OrigLocation
    }
}

# 3. Flash to Device
function Run-Flash {
    Write-Host "Flashing firmware to device on $Port..." -ForegroundColor Green
    
    $OrigLocation = Get-Location
    Set-Location $FirmwareDir
    
    try {
        idf.py -p $Port flash
        Write-Host "Flash complete! Rebooting device..." -ForegroundColor Green
    }
    finally {
        Set-Location $OrigLocation
    }
}

# 4. Clean Build Directory
function Run-Clean {
    Write-Host "Cleaning build files..." -ForegroundColor Yellow
    
    $OrigLocation = Get-Location
    Set-Location $FirmwareDir
    
    try {
        idf.py clean
        Write-Host "Clean finished." -ForegroundColor Green
    }
    finally {
        Set-Location $OrigLocation
    }
}

# Execution Router
Verify-Environment

switch ($Action) {
    "clean" {
        Run-Clean
    }
    "build" {
        Run-Build
    }
    "flash" {
        Run-Flash
    }
    "all" {
        Run-Clean
        Run-Build
        Run-Flash
    }
}
