## Memory Load/Recall Tool

Use this tool to recall previously saved information from memory.

### Tool Name
`memory_load`

### Purpose
Retrieve saved information using semantic search:
- Find similar exploits
- Recall credentials for a target
- Look up past vulnerabilities
- Get successful techniques
- Reference saved tool commands

### Parameters

- **query** (required): Natural language search query
- **max_results** (optional): Maximum results to return (default: 5)
- **category** (optional): Filter by category
  - `"exploit"`, `"vulnerability"`, `"credential"`, `"technique"`, `"finding"`, `"tool"`

### Examples

**Find SQL Injection Exploits:**
```json
{
  "query": "SQL injection exploits for login forms",
  "max_results": 3,
  "category": "exploit"
}
```

**Recall Credentials for a Target:**
```json
{
  "query": "credentials for 192.168.1.100",
  "category": "credential"
}
```

**Find Previous Vulnerabilities:**
```json
{
  "query": "MySQL remote access vulnerabilities"
}
```

**Get Metasploit Techniques:**
```json
{
  "query": "metasploit FTP exploits",
  "category": "technique"
}
```

**Recall Nmap Commands:**
```json
{
  "query": "nmap vulnerability scanning",
  "category": "tool"
}
```

### Semantic Search

The memory system uses AI embeddings for semantic search:
- Searches by meaning, not just keywords
- Finds conceptually similar information
- Works with natural language queries

**Examples:**
- Query: "password cracking" → Finds john/hashcat commands
- Query: "bypass authentication" → Finds SQL injection exploits
- Query: "network scanning" → Finds nmap/masscan techniques

### Best Practices

1. **Search before reinventing** - Check if you've solved this before
2. **Use descriptive queries** - "SSH brute force" not just "SSH"
3. **Filter by category** - Narrow down results
4. **Review multiple results** - Don't just use the first one
5. **Adapt recalled information** - Tailor to current target

### When to Use Memory Recall

**Before starting a new task:**
- ✓ Check for similar past engagements
- ✓ Look for relevant exploits
- ✓ Find useful tool commands

**During assessment:**
- ✓ Recall credentials when encountering authentication
- ✓ Look up similar vulnerabilities found before
- ✓ Get exploitation techniques for discovered services

**For efficiency:**
- ✓ Reuse working payloads
- ✓ Apply previously successful methods
- ✓ Avoid repeating failed approaches
