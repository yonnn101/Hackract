# Directory Search Instrument

Wrapper for `ffuf` to perform directory and file discovery.

## Usage
`./instruments/dir_search/dir_search.sh <url> [wordlist]`

## Arguments
- `url`: The target URL (e.g., http://example.com)
- `wordlist`: (Optional) Path to wordlist. Defaults to `/usr/share/wordlists/dirb/common.txt`

## Output
- JSON output saved to `dir_search_results.json` in the current working directory.
- Standard output shows progress.
