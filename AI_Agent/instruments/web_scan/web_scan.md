# Web Vulnerability Scan Instrument

## Description
Automated web application vulnerability scanning using nikto and additional tools.

## Purpose
Comprehensive web application security assessment including:
- Common vulnerabilities detection
- Outdated software identification
- Misconfigurations
- Directory listing
- Default files

## Usage
Call this instrument when you need to scan a web application for security issues.

## Parameters
- `url`: Full URL to scan (e.g., http://example.com)
- `output`: Output file path (optional)

## Examples

**Basic scan:**
```bash
./web_scan.sh http://target.com
```

**With output file:**
```bash
./web_scan.sh http://target.com /tmp/scan_results.txt
```

## What it checks
- SSL/TLS configuration
- Outdated server versions
- Dangerous HTTP methods
- Default files and directories
- Common vulnerabilities (XSS, SQLi indicators)
- Security headers
- Cookie security

## Output
- Detailed vulnerability report
- Severity ratings
- Recommendations
- Found directories and files

## Notes
- Non-intrusive scanning by default
- May take several minutes for complete scan
- Results saved to logs directory
