# Subdomain Enumeration Instrument

This instrument performs comprehensive subdomain enumeration using multiple techniques.

## Usage

```bash
./instruments/subdomain_enum/subdomain_enum.sh <domain> [output_file]
```

## Tools Used
- **Sublist3r**: OSINT-based enumeration
- **Assetfinder**: Go-based fast enumeration (if installed)
- **CRT.sh**: Certificate Transparency logs
- **httprobe**: Probes for live HTTP/HTTPS servers

## Output
Generates a list of live, reachable subdomains (http/https URLs).
