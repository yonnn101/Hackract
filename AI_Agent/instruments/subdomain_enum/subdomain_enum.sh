#!/bin/bash

# Subdomain Enumeration Instrument
# Combines multiple tools for comprehensive subdomain discovery

set -e

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <domain> [output_file]"
    echo "Example: $0 example.com subdomains.txt"
    exit 1
fi

DOMAIN=$1
OUTPUT_FILE=${2:-subdomains.txt}
TEMP_DIR=$(mktemp -d)

echo "==================================="
echo "SUBDOMAIN ENUMERATION INSTRUMENT"
echo "==================================="
echo "Target: $DOMAIN"
echo "Output: $OUTPUT_FILE"
echo "Started: $(date)"
echo "==================================="

# Function to check and install tool
check_tool() {
    if ! command -v $1 &> /dev/null; then
        echo "[*] Installing $1..."
        apt-get update > /dev/null
        apt-get install -y $1 > /dev/null
    fi
}

# 1. Sublist3r
echo "[+] Running Sublist3r..."
check_tool sublist3r
sublist3r -d $DOMAIN -o "$TEMP_DIR/sublist3r.txt" > /dev/null

# 2. Assetfinder (if available via go)
if command -v assetfinder &> /dev/null; then
    echo "[+] Running Assetfinder..."
    assetfinder --subs-only $DOMAIN > "$TEMP_DIR/assetfinder.txt"
fi

# 3. CRT.sh (Certificate Transparency)
echo "[+] Querying CRT.sh..."
curl -s "https://crt.sh/?q=%25.$DOMAIN&output=json" | jq -r '.[].name_value' | sed 's/\*\.//g' | sort -u > "$TEMP_DIR/crtsh.txt"

# Combine and sort unique
echo "[+] Combining results..."
cat "$TEMP_DIR"/*.txt 2>/dev/null | sort -u > "$TEMP_DIR/all_subs.txt"

# 4. Probe for live domains (httprobe)
echo "[+] Probing for live domains..."
check_tool httprobe
cat "$TEMP_DIR/all_subs.txt" | httprobe | sort -u > "$OUTPUT_FILE"

# Cleanup
rm -rf "$TEMP_DIR"

COUNT=$(wc -l < "$OUTPUT_FILE")
echo "==================================="
echo "Scan Complete"
echo "Found $COUNT live subdomains"
echo "Results saved to: $OUTPUT_FILE"
echo "==================================="
