## Code Execution Tool

Use this tool to execute commands and code in the terminal.

### Tool Name
`code_execution_tool`

### Purpose
Execute shell commands, Python scripts, or Node.js code to:
- Run security tools (nmap, nikto, sqlmap, etc.)
- **INSTALL any tools you need!**
- Perform system operations
- Execute custom security scripts
- Automate penetration testing tasks

### Parameters

- **language** (required): `"shell"`, `"python"`, or `"nodejs"`
- **code** (required): The code/commands to execute
- **timeout** (optional): Maximum execution time in seconds (default: 300)

### Installing Tools On-Demand

**YOU CAN INSTALL ANY TOOL YOU NEED!** Just use apt-get:

```bash
# Always update package lists first
apt-get update

# Install any tool
apt-get install -y <tool-name>

# Install multiple tools at once
apt-get install -y ffuf wpscan nuclei dalfox

# Search for a tool
apt-cache search <keyword>
```

### Examples

**Installing and Using a Tool:**
```json
{
  "language": "shell",
  "code": "apt-get update && apt-get install -y ffuf && ffuf -u http://target.com/FUZZ -w /usr/share/wordlists/dirb/common.txt"
}
```

**Web Application Scanning:**
```json
{
  "language": "shell",
  "code": "nikto -h http://example.com"
}
```

**SQL Injection Test:**
```json
{
  "language": "shell",
  "code": "sqlmap -u 'http://example.com/page?id=1' --batch --dbs"
}
```

**Directory Enumeration:**
```json
{
  "language": "shell",
  "code": "gobuster dir -u http://example.com -w /usr/share/wordlists/dirb/common.txt"
}
```

**Subdomain Discovery (installing tool first):**
```json
{  
  "language": "shell",
  "code": "apt-get update && apt-get install -y sublist3r && sublist3r -d example.com"
}
```

**XSS Scanner (install and use):**
```json
{
  "language": "shell",
  "code": "pip3 install dalfox && dalfox url http://example.com/search?q=test"
}
```

**WordPress Scan:**
```json
{
  "language": "shell",
  "code": "wpscan --url http://example.com --enumerate vp,vt,u"
}
```

**API Parameter Discovery:**
```json
{
  "language": "shell",
  "code": "apt-get install -y arjun && arjun -u http://api.example.com/endpoint"
}
```

**Custom Python Script for Web Testing:**
```json
{
  "language": "python",
  "code": "import requests\nurl = 'http://example.com/login'\npayloads = [\"' OR '1'='1' --\", \"admin' --\", \"' OR 1=1--\"]\nfor payload in payloads:\n    data = {'username': payload, 'password': 'test'}\n    r = requests.post(url, data=data)\n    if 'Welcome' in r.text:\n        print(f'SQLi successful with: {payload}')"
}
```

**JWT Token Analysis:**
```json
{
  "language": "shell",
  "code": "npm install -g jwt-cli && jwt decode eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Web Application Testing Tools

**Essential Web Testing Commands:**

**Technology Detection:**
```bash
whatweb http://target.com
```

**Subdomain Enumeration:**
```bash
# Using sublist3r (install first if needed)
apt-get install -y sublist3r && sublist3r -d target.com

# Using amass (install first)
apt-get install -y amass && amass enum -d target.com
```

**Directory/File Fuzzing:**
```bash
# ffuf (fast, install if needed)
apt-get install -y ffuf && ffuf -u http://target.com/FUZZ -w /usr/share/wordlists/dirb/common.txt

# gobuster (already installed)
gobuster dir -u http://target.com -w /usr/share/wordlists/dirb/common.txt

# dirsearch (already installed)
dirsearch -u http://target.com
```

**CMS-Specific Scanning:**
```bash
# WordPress
wpscan --url http://target.com --enumerate vp,vt,u

# Joomla (install first)
apt-get install -y joomscan && joomscan -u http://target.com

# Drupal (install first)
pip3 install droopescan && droopescan scan drupal -u http://target.com
```

**Web Vulnerability Scanners:**
```bash
# Nikto (already installed)
nikto -h http://target.com

# Nuclei (install first)
apt-get install -y nuclei && nuclei -u http://target.com

# ZAP baseline scan (install first)
apt-get install -y zaproxy && zap-baseline.py -t http://target.com
```

**SQL Injection:**
```bash
# sqlmap (already installed)
sqlmap -u "http://target.com/page?id=1" --batch --dbs --level=3 --risk=2
```

**XSS Testing:**
```bash
# dalfox (install via pip/go)
pip3 install dalfox && dalfox url http://target.com/search?q=test

# xsser (install first)
apt-get install -y xsser && xsser -u "http://target.com/search?q=XSS"
```

**SSL/TLS Testing:**
```bash
# sslscan (already installed)
sslscan target.com

# testssl.sh (install first)
apt-get install -y testssl.sh && testssl.sh target.com
```

**WAF Detection:**
```bash
# wafw00f (already installed)
wafw00f http://target.com
```

### Best Practices

1. **Install tools when needed**: `apt-get update && apt-get install -y <tool>`
2. **Start with reconnaissance**: Use `whatweb`, `nmap` to understand the target
3. **Use appropriate timeouts**: Long scans may need `timeout: 600` or more
4. **Parse important output**: Extract key findings from results
5. **Save findings to memory**: Use `memory_save` for important discoveries
6. **Check tool availability**: `which <tool>` to verify installation
7. **Combine tools**: Install and use multiple tools in one command

### Tool Installation Reference

**Package managers available:**
- `apt-get` - Debian/Kali packages
- `pip3` - Python packages
- `npm` - Node.js packages
- `gem` - Ruby packages
- `go install` - Go packages
- `git clone` - GitHub repositories

**Finding tools:**
```bash
# Search Kali repos
apt-cache search web scanner

# Search Python packages
pip3 search security

# Install directly from GitHub
git clone https://github.com/author/tool.git
cd tool && pip3 install -r requirements.txt
```

### Error Handling

If a command fails:
1. **Tool not found?** → Install it with `apt-get install -y <tool>`
2. **Permission denied?** → You have root, shouldn't happen
3. **Syntax error?** → Check tool documentation: `<tool> --help`
4. **Timeout?** → Increase timeout parameter or use faster alternatives
5. **Command not found?** → Search and install: `apt-cache search <keyword>`

### Remember

- **You can install ANYTHING from Kali repositories**
- **Don't hesitate to install tools mid-task**
- **Combine installation + execution in one command**
- **Save successful commands/payloads to memory**
- **Always update apt before installing**: `apt-get update`
