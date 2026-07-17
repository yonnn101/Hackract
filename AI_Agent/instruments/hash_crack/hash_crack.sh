#!/bin/bash

# Hash Cracking Instrument
# Automated password hash cracking

set -e

# Check arguments
if [ $# -lt 2 ]; then
    echo "Usage: $0 <hashfile> <hash_type> [wordlist]"
    echo "Hash types: md5, sha1, sha256, sha512, ntlm, bcrypt, mysql"
    echo "Example: $0 hashes.txt md5"
    exit 1
fi

HASHFILE=$1
HASHTYPE=$2
WORDLIST=${3:-/usr/share/wordlists/rockyou.txt}

# Check if hashfile exists
if [ ! -f "$HASHFILE" ]; then
    echo "[!] Error: Hash file not found: $HASHFILE"
    exit 1
fi

# Check if wordlist exists
if [ ! -f "$WORDLIST" ]; then
    echo "[!] Wordlist not found: $WORDLIST"
    echo "[*] Downloading rockyou.txt..."
    if [ ! -f "/usr/share/wordlists/rockyou.txt.gz" ]; then
        echo "[!] rockyou.txt not available. Please specify a valid wordlist."
        exit 1
    fi
    gunzip /usr/share/wordlists/rockyou.txt.gz 2>/dev/null || true
    WORDLIST="/usr/share/wordlists/rockyou.txt"
fi

echo "==================================="
echo "HASH CRACKING INSTRUMENT"
echo "==================================="
echo "Hash File: $HASHFILE"
echo "Hash Type: $HASHTYPE"
echo "Wordlist: $WORDLIST"
echo "Started: $(date)"
echo "==================================="
echo ""

# Map hash type to John format
case $HASHTYPE in
    md5)
        JOHN_FORMAT="raw-md5"
        ;;
    sha1)
        JOHN_FORMAT="raw-sha1"
        ;;
    sha256)
        JOHN_FORMAT="raw-sha256"
        ;;
    sha512)
        JOHN_FORMAT="raw-sha512"
        ;;
    ntlm)
        JOHN_FORMAT="nt"
        ;;
    bcrypt)
        JOHN_FORMAT="bcrypt"
        ;;
    mysql)
        JOHN_FORMAT="mysql-sha1"
        ;;
    *)
        echo "[!] Unknown hash type: $HASHTYPE"
        echo "[*] Attempting auto-detection..."
        JOHN_FORMAT=""
        ;;
esac

# Run John the Ripper
echo "[*] Starting John the Ripper..."
if [ -n "$JOHN_FORMAT" ]; then
    john --format=$JOHN_FORMAT --wordlist=$WORDLIST $HASHFILE
else
    john --wordlist=$WORDLIST $HASHFILE
fi

echo ""  
echo "[*] Cracking complete. Showing results..."
john --show $HASHFILE

echo ""
echo "==================================="
echo "Results saved by John the Ripper"
echo "Completed: $(date)"
echo "==================================="
echo ""
echo "[+] To see all cracked passwords:"
echo "    john --show $HASHFILE"
