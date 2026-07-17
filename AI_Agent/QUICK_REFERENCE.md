# Quick Reference Card - HackrAct AI Agent

## 🎯 Core Philosophy
**You can install ANY Kali Linux tool you need. Don't ask, just install and use it!**

## 📦 Installing Tools

```bash
# Update package list first
apt-get update

# Install any tool
apt-get install -y <tool-name>

# Install multiple tools
apt-get install -y ffuf wpscan nuclei dalfox amass

# Search for tools
apt-cache search <keyword>

# Example: Install and immediately use
apt-get update && apt-get install -y ffuf && ffuf -u http://target.com/FUZZ -w /usr/share/wordlists/dirb/common.txt
```

## 🌐 Web Application Testing Focus

### Phase 1: Information Gathering
```bash
# Technology detection
whatweb http://target.com

# Subdomain enumeration (install if needed)
apt-get install -y sublist3r && sublist3r -d target.com
apt-get install -y amass && amass enum -d target.com

# Port scanning
nmap -sV -p80,443,8080,8443 target.com

# WAF detection
wafw00f http://target.com
```

### Phase 2: Directory/File Discovery
```bash
# Fast fuzzing (install ffuf)
apt-get install -y ffuf
ffuf -u http://target.com/FUZZ -w /usr/share/wordlists/dirb/common.txt

# Gobuster (pre-installed)
gobuster dir -u http://target.com -w /usr/share/wordlists/dirb/common.txt

# Dirsearch (pre-installed)
dirsearch -u http://target.com
```

### Phase 3: Web Vulnerability Scanning
```bash
# Nikto (pre-installed)
nikto -h http://target.com

# Nuclei (install first)
apt-get install -y nuclei
nuclei -u http://target.com -t ~/nuclei-templates/

# OWASP ZAP (install first)
apt-get install -y zaproxy
```

### Phase 4: SQL Injection
```bash
# SQLMap (pre-installed)
sqlmap -u "http://target.com/page?id=1" --batch --dbs --level=3

# Manual testing
curl "http://target.com/login" -d "user=admin' OR '1'='1' --&pass=test"
```

### Phase 5: XSS Testing
```bash
# Dalfox (install via pip)
pip3 install dalfox
dalfox url "http://target.com/search?q=test"

# XSSer (install first)
apt-get install -y xsser
xsser -u "http://target.com/search?q=XSS"
```

### Phase 6: CMS-Specific Testing
```bash
# WordPress
wpscan --url http://target.com --enumerate vp,vt,u

# Joomla (install first)
apt-get install -y joomscan
joomscan -u http://target.com

# Drupal (install first)
pip3 install droopescan
droopescan scan drupal -u http://target.com
```

### Phase 7: API Testing
```bash
# Parameter discovery (install arjun)
apt-get install -y arjun
arjun -u http://api.target.com/endpoint

# API fuzzing with ffuf
ffuf -u http://api.target.com/FUZZ -w api-wordlist.txt
```

### Phase 8: SSL/TLS Testing
```bash
# SSLScan (pre-installed)
sslscan target.com

# TestSSL (install first)
apt-get install -y testssl.sh
testssl.sh target.com
```

## 🔧 Essential Web Testing Tools

### Pre-Installed
- nmap, nikto, sqlmap, gobuster, dirb, wfuzz
- wpscan, whatweb, wafw00f, httprobe
- dirsearch, sublist3r
- john, hashcat, hydra, medusa
- metasploit-framework

### Install On-Demand
```bash
# Modern fuzzers
apt-get install -y ffuf feroxbuster

# Subdomain/asset discovery
apt-get install -y amass subfinder assetfinder

# Advanced scanners
apt-get install -y nuclei zaproxy

# XSS tools
pip3 install dalfox
apt-get install -y xsser

# CMS scanners  
apt-get install -y joomscan
pip3 install droopescan

# API testing
apt-get install -y arjun

# SSL/TLS
apt-get install -y testssl.sh sslyze

# And hundreds more!
```

## 💾 Memory Usage

**Save findings:**
```python
await memory_save.execute(
    content="SQL injection in /login.php - payload: admin' OR '1'='1' --",
    category="exploit",
    tags=["sqli", "authentication-bypass"]
)
```

**Recall findings:**
```python
await memory_load.execute(
    query="SQL injection payloads",
    category="exploit"
)
```

## 📊 OWASP Top 10 (2021)

1. Broken Access Control (IDOR, privilege escalation)
2. Cryptographic Failures (sensitive data exposure)
3. Injection (SQL, NoSQL, OS command, LDAP)
4. Insecure Design
5. Security Misconfiguration
6. Vulnerable and Outdated Components
7. Identification and Authentication Failures
8. Software and Data Integrity Failures
9. Security Logging and Monitoring Failures
10. Server-Side Request Forgery (SSRF)

## 🎓 Quick Workflow Example

```bash
# 1. Recon
whatweb http://target.com
nmap -sV -p- target.com

# 2. Install needed tools
apt-get update && apt-get install -y ffuf wpscan nuclei

# 3. Directory enumeration
ffuf -u http://target.com/FUZZ -w /usr/share/wordlists/dirb/common.txt

# 4. Technology-specific (WordPress example)
wpscan --url http://target.com --enumerate vp,vt,u

# 5. Vuln scanning
nikto -h http://target.com
nuclei -u http://target.com

# 6. SQL injection
sqlmap -u "http://target.com/page?id=1" --batch --dbs

# 7. Save findings to memory
# (use memory_save tool)
```

## 🚀 Pro Tips

1. **Always `apt-get update` before installing**
2. **Install tools as you need them** - don't wait
3. **Combine commands**: `apt-get install -y tool && tool -u target`
4. **Use wildcards for multiple installs**: `apt-get install -y ffuf wpscan nuclei`
5. **Save successful payloads to memory immediately**
6. **Check wordlists**: `/usr/share/wordlists/` and `/usr/share/seclists/`
7. **Tool not found?** → `apt-cache search <keyword>` then install

## 🔍 Finding More Tools

```bash
# Browse web testing tools
apt-cache search kali-tools-web

# Search for specific functionality
apt-cache search sql injection
apt-cache search xss scanner
apt-cache search subdomain

# Install entire tool category
apt-get install -y kali-tools-web
```

---

**Remember: YOU HAVE FULL ROOT ACCESS. INSTALL ANYTHING YOU NEED!** 🛡️
