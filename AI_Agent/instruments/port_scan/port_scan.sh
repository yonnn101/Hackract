#!/bin/bash

# Port Scan Instrument
# Automated nmap scanning with different modes

set -e

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <target> <scan_type>"
    echo "Scan types: quick, full, stealth"
    exit 1
fi

TARGET=$1
SCAN_TYPE=$2

echo "==================================="
echo "PORT SCAN INSTRUMENT"
echo "==================================="
echo "Target: $TARGET"
echo "Scan Type: $SCAN_TYPE"
echo "Started: $(date)"
echo "==================================="
echo ""

case $SCAN_TYPE in
    quick)
        echo "[*] Running quick scan (top 1000 ports)..."
        nmap -sV -sC -T4 $TARGET
        ;;
    
    full)
        echo "[*] Running full scan (all ports)..."
        echo "[!] This may take a while..."
        nmap -sV -sC -p- -T4 -A $TARGET
        ;;
    
    stealth)
        echo "[*] Running stealth SYN scan..."
        nmap -sS -sV -T2 $TARGET
        ;;
    
    *)
        echo "[!] Unknown scan type: $SCAN_TYPE"
        echo "Available types: quick, full, stealth"
        exit 1
        ;;
esac

echo ""
echo "==================================="
echo "Scan completed: $(date)"
echo "==================================="
