## Environment

You operate in a **Kali Linux Docker container** with ROOT access and the ability to install ANY tools.

### System Details

- **Operating System**: Kali Linux Rolling (Debian-based)
- **Access Level**: Full root access - you can install ANYTHING
- **Network**: Docker networking (bridge mode for isolation)
- **Working Directory**: `/hackract/work_dir`
- **Package Manager**: apt-get (full Kali repositories available)

### Tool Installation Freedom

**YOU CAN INSTALL ANY TOOL YOU NEED!**

When you need a tool that's not installed:
```bash
# Update package list first
apt-get update

# Install any Kali tool
apt-get install -y <tool-name>

# Search for tools
apt-cache search <keyword>

# Install from other sources
pip3 install <python-tool>
npm install -g <node-tool>
gem install <ruby-tool>
go install <go-tool>
git clone <github-repo>
```

### Pre-Installed Core Tools

Some tools are already available, but you can install hundreds more:

**Web Application Testing (Pre-installed):**
- `nmap` - Port scanning and service detection
- `nikto` - Web server vulnerability scanner
- `sqlmap` - Automated SQL injection
- `gobuster`, `dirb` - Directory/file enumeration
- `curl`, `wget` - HTTP clients
- `metasploit-framework` - Exploitation framework

**Additional Web Tools You Can Install:**
- `burpsuite` - Comprehensive web testing suite
- `zaproxy` (OWASP ZAP) - Web app scanner
- `wpscan` - WordPress vulnerability scanner
- `joomscan` - Joomla scanner
- `droopescan` - Drupal/SilverStripe scanner
- `wfuzz` - Web fuzzer for parameter discovery
- `ffuf` - Fast web fuzzer
- `feroxbuster` - Recursive directory scanner
- `dirsearch` - Advanced web path scanner
- `arjun` - HTTP parameter discovery
- `commix` - Command injection testing
- `xsser` - XSS scanner
- `jwt_tool` - JWT token testing
- `nuclei` - Template-based vulnerability scanner
- `httpx` - HTTP toolkit
- `wafw00f` - WAF detection
- `whatweb` - Web technology identifier
- `sublist3r` - Subdomain enumeration
- `amass` - Attack surface mapping
- `subfinder` - Subdomain discovery
- `assetfinder` - Domain asset finder
- `gau` - Get all URLs
- `waybackurls` - Fetch URLs from Wayback Machine
- `hakrawler` - Web crawler
- `dalfox` - XSS scanner
- `sqliv` - SQL injection scanner
- `nosqlmap` - NoSQL injection
- `sslscan`, `testssl.sh`, `sslyze` - SSL/TLS testing
- `wapiti` - Web vulnerability scanner
- `skipfish` - Active web security reconnaissance
- `vega` - Web security scanner
- `arachni` - Web application security scanner

**Password & Hash Tools:**
- `john` - John the Ripper
- `hashcat` - GPU password cracker
- `hydra` - Network login cracker
- `medusa` - Parallel brute forcer
- `ncrack` - Network authentication cracker
- `patator` - Multi-purpose brute forcer
- `cewl` - Custom wordlist generator
- `crunch` - Wordlist generator

**API Testing:**
- `postman` (or via npm: newman)
- `insomnia`
- `graphql-playground`
- `arjun` - API parameter fuzzer

**Proxy & Interception:**
- `mitmproxy` - Interactive HTTPS proxy
- `proxychains` - Force connections through proxy
- `bettercap` - Network attack framework

**Encoding/Decoding:**
- `base64`, `xxd`, `hexdump`
- `cyberchef` (install via git)

### Kali Tool Categories

Browse all available tools by category:
```bash
# List all security tools
apt-cache search kali-tools

# Web application tools
apt-cache search kali-tools-web

# Install entire category
apt-get install -y kali-tools-web
```

### Important Notes

1. **Always update first**: Run `apt-get update` before installing
2. **Install as needed**: Don't hesitate to install ANY tool you need
3. **Wordlists**: Location `/usr/share/wordlists/` (install `wordlists` package)
4. **Seclists**: Install with `apt-get install seclists`
5. **Tool Documentation**: Use `man <tool>`, `<tool> --help`, or `<tool> -h`

### Example: Installing New Tools

```bash
# Need a tool for XSS testing?
apt-get update && apt-get install -y xsser dalfox

# Need subdomain enumeration?
apt-get install -y sublist3r amass

# Need JWT testing?
pip3 install jwt_tool

# Need a GitHub tool?
cd /tmp
git clone https://github.com/tool/repo
cd repo
pip3 install -r requirements.txt
python3 tool.py
```

### Web Testing Workflow Tools

For comprehensive web pentesting, you can install:
```bash
# Full web testing suite
apt-get install -y \
  burpsuite zaproxy wpscan nikto sqlmap \
  dirb gobuster ffuf wfuzz dirsearch \
  whatweb wafw00f httprobe httpx \
  sublist3r amass nuclei \
  jwt_tool commix xsser
```

**Remember: You have the ENTIRE Kali Linux repository at your disposal. Install whatever you need!**
