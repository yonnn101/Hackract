#!/bin/bash
# Wrapper for directory searching using ffuf
# Usage: ./dir_search.sh <url> [wordlist]

TARGET=$1
WORDLIST=${2:-/usr/share/wordlists/dirb/common.txt}
OUTPUT_FILE="dir_search_results.json"

if [ -z "$TARGET" ]; then
    echo "Usage: $0 <url> [wordlist]"
    exit 1
fi

# Check if ffuf is installed
if ! command -v ffuf &> /dev/null; then
    echo "Error: ffuf is not installed. Please install it first."
    exit 1
fi

echo "[*] Starting directory search on $TARGET using $WORDLIST"
# -mc: Match codes (200, 204, 301, 302, 307, 401, 403)
# -ac: Auto-calibration
ffuf -u "$TARGET/FUZZ" -w "$WORDLIST" -o "$OUTPUT_FILE" -of json -mc 200,204,301,302,307,401,403 -ac

echo "[*] Scan complete. Results saved to $OUTPUT_FILE"
