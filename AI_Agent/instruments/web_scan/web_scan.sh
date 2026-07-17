#!/bin/bash

# Web Vulnerability Scan Instrument
# Automated web application security scanning

set -e

# Check arguments
if [ $# -lt 1 ]; then
    echo "Usage: $0 <url> [output_file]"
    echo "Example: $0 http://example.com"
    exit 1
fi

URL=$1
OUTPUT=${2:-/hackract/logs/web_scan_$(date +%Y%m%d_%H%M%S).txt}

echo "==================================="
echo "WEB VULNERABILITY SCAN INSTRUMENT"
echo "==================================="
echo "Target: $URL"
echo "Output: $OUTPUT"
echo "Started: $(date)"
echo "==================================="
echo ""

# Create output directory if needed
mkdir -p $(dirname $OUTPUT)

echo "[*] Running Nikto scan..."
nikto -h $URL -Format txt -output $OUTPUT

echo ""
echo "[*] Checking for directory listing..."
curl -s $URL | grep -i "index of" && echo "[!] Directory listing detected!" || echo "[+] No directory listing"

echo ""
echo "[*] Checking robots.txt..."
curl -s ${URL}/robots.txt && echo "[+] robots.txt found" || echo "[-] No robots.txt"

echo ""
echo "[*] Checking security headers..."
curl -sI $URL | grep -i "x-frame-options\|x-xss-protection\|x-content-type\|strict-transport"

echo ""
echo "[*] Common files check..."
for file in admin.php phpinfo.php test.php backup.zip .git/config; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" ${URL}/${file})
    if [ "$STATUS" = "200" ]; then
        echo "[!] Found: ${URL}/${file}"
    fi
done

echo ""
echo "==================================="
echo "Scan completed: $(date)"
echo "Full results saved to: $OUTPUT"
echo "==================================="
echo ""
echo "[*] Summary of critical findings:"
grep -i "OSVDB\|vulnerable" $OUTPUT | head -10 || echo "[+] No critical vulnerabilities found by automatic scan"
