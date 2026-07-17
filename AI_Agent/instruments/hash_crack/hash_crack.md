# Hash Cracking Instrument

## Description
Automated password hash cracking using John the Ripper and hashcat.

## Purpose
Crack password hashes using:
- Dictionary attacks
- Common wordlists
- Rule-based mutations
- Brute force (when appropriate)

## Usage
Use this instrument to crack password hashes found during penetration testing.

## Parameters
- `hashfile`: File containing hashes to crack (one per line)
- `hash_type`: Type of hash (md5, sha256, ntlm, etc.)
- `wordlist`: Path to wordlist (default: rockyou.txt)

## Examples

**Basic MD5 cracking:**
```bash
./hash_crack.sh hashes.txt md5
```

**SHA256 with custom wordlist:**
```bash
./hash_crack.sh hashes.txt sha256 /path/to/wordlist.txt
```

**NTLM hashes:**
```bash
./hash_crack.sh ntlm_hashes.txt ntlm
```

## Supported Hash Types
- MD5
- SHA1, SHA256, SHA512
- NTLM
- bcrypt
- MySQL (old and new)
- And many more...

## Process
1. Identifies hash type (if not specified)
2. Tries common passwords first
3. Uses rockyou.txt wordlist
4. Applies John the Ripper rules
5. If time permits, tries hashcat with GPU

## Output
- Cracked passwords
- Success rate
- Time taken
- Saved results

## Notes
- Larger wordlists take longer
- GPU acceleration available with hashcat
- Some hash types are very slow to crack
- Always comply with legal and authorized use
