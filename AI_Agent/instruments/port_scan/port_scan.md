# Port Scan Instrument

## Description
Automated port scanning instrument that performs comprehensive network reconnaissance.

## Purpose
Quick and thorough port scanning with nmap, including service version detection and default script scanning.

## Usage
Call this instrument when you need to:
- Scan a target for open ports
- Identify services and versions
- Detect operating system
- Run default security scripts

## Parameters
- `target`: IP address or hostname to scan
- `scan_type`: Type of scan (quick, full, stealth)
  - `quick`: Top 1000 ports with version detection
  - `full`: All 65535 ports with comprehensive scripts
  - `stealth`: SYN scan with minimal detection

## Examples

**Quick scan:**
```bash
./port_scan.sh 192.168.1.100 quick
```

**Full scan:**
```bash
./port_scan.sh 192.168.1.100 full
```

**Stealth scan:**
```bash
./port_scan.sh 192.168.1.100 stealth
```

## Output
- List of open ports with services
- Service versions
- OS detection (if possible)
- Vulnerability scripts results
- Recommendations

## Notes
- Requires root/sudo for certain scan types
- Full scans can take significant time
- Stealth scans are less detectable but may miss information
