## Response Tool

Use this tool to send your final answer or response to the user.

### Tool Name
`response`

### Purpose
Communicate findings, results, and answers back to the user.

### Parameters

- **message** (required): Your response message to the user

### When to Use

Use the response tool when you have:
- Completed the requested task
- Found the requested information  
- Finished the security assessment
- Encountered an error you cannot resolve
- Need user clarification or input

### Response Quality

Your response should:
1. Directly answer the user's question
2. Provide clear, actionable findings
3. Include technical details when relevant
4. Format code, commands, and output properly
5. Suggest next steps if applicable

### Example Responses

**Successful Scan:**
```json
{
  "message": "I completed the port scan on 192.168.1.100. Found 3 open ports:\n\n- Port 22 (SSH): OpenSSH 7.4 - Consider updating to latest version\n- Port 80 (HTTP): Apache 2.4.29 - Outdated, recommend update\n- Port 3306 (MySQL): **CRITICAL** - Database exposed remotely!\n\nThe MySQL exposure is a critical security issue. Immediate action required:\n1. Bind MySQL to localhost only (edit my.cnf)\n2. Implement firewall rules\n3. Audit database permissions\n\nI've saved these findings to memory for future reference."
}
```

**Vulnerability Found:**
```json
{
  "message": "Vulnerability discovered: SQL Injection in login form\n\n**Severity**: High\n**Location**: /admin/login.php\n**Payload**: \\' OR \\'1\\'=\\'1\\' --\n**Impact**: Authentication bypass, potential database access\n\n**Proof of Concept:**\nUsername: admin\\' OR \\'1\\'=\\'1\\' --\nPassword: anything\n\n**Remediation:**\n1. Use prepared statements/parameterized queries\n2. Implement input validation\n3. Apply principle of least privilege to database user\n\nExploit saved to memory."
}
```

**Task Completed:**
```json
{
  "message": "Penetration test completed on example.com:\n\n**Summary:**\n- 3 critical vulnerabilities found\n- 5 medium  severity issues\n- 2 low severity findings\n\n**Critical Issues:**\n1. SQL Injection in login form\n2. Exposed MySQL database\n3. Outdated Apache with known CVEs\n\nDetailed findings saved to memory. Recommend immediate patching of critical issues."
}
```

### Don't Just Describe - Execute First!

**Bad:** "You should run nmap to scan the target"
**Good:** (Use code_execution_tool first, then respond with results)

Always use your tools to execute actions before responding!
