#!/usr/bin/env bash
# HVAC Helper Pro: Firmware Build & Flash Automation Script
# Usage:
#   ./scripts/build-firmware.sh build
#   ./scripts/build-firmware.sh flash /dev/ttyUSB0
#   ./scripts/build-firmware.sh all /dev/ttyUSB0

set -e

ACTION=$1
PORT=${2:-"/dev/ttyUSB0"}
FIRMWARE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../firmware" && pwd)"
PARTITION_LIMIT_BYTES=1572864 # 1.5MB in bytes

echo -e "\033[36m=== HVAC Helper Pro: Firmware Tooling ===\033[0m"

# 1. Environment Verification
verify_environment() {
    echo "Checking ESP-IDF environment..."
    if ! command -v idf.py &> /dev/null; then
        if [ -n "$IDF_PATH" ]; then
            if [ -f "$IDF_PATH/export.sh" ]; then
                echo -e "\033[33mFound IDF_PATH, sourcing export.sh...\033[0m"
                . "$IDF_PATH/export.sh"
            else
                echo -e "\033[31mError: export.sh not found at $IDF_PATH/export.sh\033[0m"
                exit 1
            fi
        else
            echo -e "\033[31mError: idf.py is not in PATH, and IDF_PATH is not set.\033[0m"
            echo "Please run: . /path/to/esp-idf/export.sh"
            exit 1
        fi
    fi
}

# 2. Execute Build
run_build() {
    echo -e "\033[32mStarting ESP-IDF build process...\033[0m"
    cd "$FIRMWARE_DIR"
    idf.py build

    BIN_PATH="$FIRMWARE_DIR/build/hvac-helper-firmware.bin"
    if [ -f "$BIN_PATH" ]; then
        BIN_SIZE=$(wc -c < "$BIN_PATH")
        BIN_SIZE_KB=$((BIN_SIZE / 1024))
        
        echo -e "\033[36m--------------------------------------------------\033[0m"
        echo -e "\033[32mBuild Complete!\033[0m"
        echo "Binary: $BIN_PATH"
        echo "Compiled Size: $BIN_SIZE_KB KB ($BIN_SIZE bytes)"
        
        if [ "$BIN_SIZE" -gt "$PARTITION_LIMIT_BYTES" ]; then
            echo -e "\033[31mWARNING: Compiled binary size ($BIN_SIZE_KB KB) EXCEEDS the 1.5MB (1536 KB) OTA application partition limit!\033[0m"
            echo -e "\033[33mAction Required: Optimize binary or reduce enabled NimBLE features in sdkconfig.\033[0m"
        else
            REMAINING=$(((PARTITION_LIMIT_BYTES - BIN_SIZE) / 1024))
            echo -e "\033[32mSUCCESS: Binary fits within 1.5MB limit. Free partition space: $REMAINING KB.\033[0m"
        fi
        echo -e "\033[36m--------------------------------------------------\033[0m"
    else
        echo -e "\033[31mError: Build succeeded but output binary not found at $BIN_PATH\033[0m"
        exit 1
    fi
}

# 3. Flash to Device
run_flash() {
    echo -e "\033[32mFlashing firmware to device on $PORT...\033[0m"
    cd "$FIRMWARE_DIR"
    idf.py -p "$PORT" flash
    echo -e "\033[32mFlash complete!\033[0m"
}

# 4. Clean Build Directory
run_clean() {
    echo -e "\033[33mCleaning build files...\033[0m"
    cd "$FIRMWARE_DIR"
    idf.py clean
    echo -e "\033[32mClean finished.\033[0m"
}

verify_environment

case "$ACTION" in
    clean)
        run_clean
        ;;
    build)
        run_build
        ;;
    flash)
        run_flash
        ;;
    all)
        run_clean
        run_build
        run_flash
        ;;
    *)
        echo "Usage: $0 {build|flash|all|clean} [port]"
        exit 1
        ;;
esac
