## Memory Save Tool

Use this tool to save important information to long-term memory.

### Tool Name
`memory_save`

### Purpose
Store information for future recall:
- Successful exploits
- Discovered vulnerabilities
- Credentials (hashes or plaintext)
- Attack techniques
- Security findings
- Tool commands that worked

### Parameters

- **content** (required): The information to save
- **category** (required): Classification of the memory
  - `"exploit"` - Working exploits and attack code
  - `"vulnerability"` - Discovered vulnerabilities
  - `"credential"` - Found credentials
  - `"technique"` - Successful attack techniques
  - `"finding"` - General security findings
  - `"tool"` - Useful tool commands
- **tags** (optional): List of tags for organization

### Examples

**Save an Exploit:**
```json
{
  "content": "SQL injection in login form at /admin/login.php using payload: ' OR '1'='1' -- ",
  "category": "exploit",
  "tags": ["sqli", "authentication bypass", "web"]
}
```

**Save Credentials:**
```json
{
  "content": "Found SSH credentials for 192.168.1.100: username=admin, password=P@ssw0rd123",
  "category": "credential",
  "tags": ["ssh", "admin"]
}
```

**Save Vulnerability:**
```json
{
  "content": "Target 192.168.1.50 port 3306 (MySQL) exposed remotely. Version 5.7.29 vulnerable to CVE-2020-14567",
  "category": "vulnerability",
  "tags": ["mysql", "cve", "critical"]
}
```

**Save Successful Technique:**
```json
{
  "content": "Successfully used Metasploit module 'exploit/unix/ftp/vsftpd_234_backdoor' against 192.168.1.20",
  "category": "technique",
  "tags": ["metasploit", "ftp", "backdoor"]
}
```

**Save Useful Command:**
```json
{
  "content": "nmap -sV -sC -p- --script vuln 192.168.1.0/24 - Comprehensive vulnerability scan of network",
  "category": "tool",
  "tags": ["nmap", "scanning", "network"]
}
```

### Best Practices

1. **Save immediately after discovery** - Don't wait until the end
2. **Be specific** - Include IP addresses, ports, exact payloads
3. **Use clear categories** - Makes recall easier
4. **Add relevant tags** - Helps with filtering
5. **Include context** - What worked, what didn't, why
6. **Save successful attempts** - Even if they seem obvious

### What to Save

**Always save:**
- ✓ Working exploits
- ✓ Discovered credentials
- ✓ Critical vulnerabilities
- ✓ Successful privilege escalation methods
- ✓ Effective tool command combinations

**Consider saving:**
- Interesting findings
- Tool tips and tricks
- Common pitfalls to avoid
- Reconnaissance data
