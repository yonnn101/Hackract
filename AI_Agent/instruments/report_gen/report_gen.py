#!/usr/bin/env python3
"""
Report Generator Instrument
Gathers logs and results from the work directory and generates a Markdown report.
"""

import os
import glob
import datetime

WORK_DIR = "."
REPORT_FILE = "REPORT.md"

def generate_report():
    report_content = f"# Security Assessment Report\n"
    report_content += f"**Date:** {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\n"
    
    # Find all relevant files
    files = []
    extensions = ['*.txt', '*.json', '*.xml', '*.log', '*.md']
    for ext in extensions:
        files.extend(glob.glob(os.path.join(WORK_DIR, ext)))
        
    # Filter out the report file itself and scratchpad
    files = [f for f in files if os.path.basename(f) not in [REPORT_FILE, "scratchpad.md"]]
    
    if not files:
        report_content += "No result files found in the working directory.\n"
    else:
        report_content += "## Findings\n\n"
        for file_path in sorted(files):
            filename = os.path.basename(file_path)
            report_content += f"### File: `{filename}`\n\n"
            report_content += "```\n"
            try:
                with open(file_path, 'r', encoding='utf-8', errors='replace') as f:
                    content = f.read()
                    # Truncate if too long
                    if len(content) > 5000:
                        content = content[:5000] + "\n... [Truncated] ..."
                    report_content += content
            except Exception as e:
                report_content += f"Error reading file: {e}"
            report_content += "\n```\n\n"

    with open(REPORT_FILE, 'w', encoding='utf-8') as f:
        f.write(report_content)
    
    print(f"[*] Report generated: {REPORT_FILE}")

if __name__ == "__main__":
    generate_report()
