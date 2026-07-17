#!/bin/bash
# Wrapper for vulnerability scanning using nuclei
# Usage: ./vuln_scan.sh <url>

TARGET=$1
OUTPUT_FILE="vuln_scan_results.txt"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <url>"
    exit 1
fi

# Check if nuclei is installed
if ! command -v nuclei &> /dev/null; then
    echo "Error: nuclei is not installed. Please install it first."
    exit 1
fi

echo "[*] Starting vulnerability scan on $TARGET"
# Run nuclei with default templates
nuclei -u "$TARGET" -o "$OUTPUT_FILE"

echo "[*] Scan complete. Results saved to $OUTPUT_FILE"
