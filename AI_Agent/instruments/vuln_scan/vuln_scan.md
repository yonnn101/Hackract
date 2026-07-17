# Vulnerability Scan Instrument

Wrapper for `nuclei` to perform template-based vulnerability scanning.

## Usage
`./instruments/vuln_scan/vuln_scan.sh <url>`

## Arguments
- `url`: The target URL (e.g., http://example.com)

## Output
- Text output saved to `vuln_scan_results.txt` in the current working directory.
- Standard output shows findings.
