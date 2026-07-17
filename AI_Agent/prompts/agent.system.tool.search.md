## Search Tool (Web Search)

Use this tool to search the web for threat intelligence, CVEs, exploits, and security information.

### Tool Name
`search`

### Purpose
- Look up CVE details and patches
- Find exploit techniques and public PoCs
- Research vulnerability information
- Get current threat intelligence

### Parameters

- **query** (required): Search query (e.g. "CVE-2024-1234", "SQL injection techniques")
- **max_results** (optional): Maximum number of results (default: 5)

### When to Use

Use the search tool when you need up-to-date information from the web that is not in your memory or code execution environment.

### Example

```json
{
  "thoughts": "I need to look up this CVE to confirm severity and patch status.",
  "tool_name": "search",
  "tool_args": {
    "query": "CVE-2024-1234 Apache vulnerability",
    "max_results": 5
  }
}
```
