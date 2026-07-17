"""
HackrAct AI Agent - CLI Runner

Entry point for running the agent in terminal mode
"""

import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from agent import Agent


def print_banner():
    """Print ASCII banner"""
    banner = """
╦ ╦┌─┐┌─┐┬┌─┬─┐╔═╗┌─┐┌┬┐  ╔═╗╦  ╔═╗┌─┐┌─┐┌┐┌┌┬┐
╠═╣├─┤│  ├┴┐├┬┘╠═╣│   │   ╠═╣║  ╠═╣│ ┬├┤ │││ │ 
╩ ╩┴ ┴└─┘┴ ┴┴└─╩ ╩└─┘ ┴   ╩ ╩╩  ╩ ╩└─┘└─┘┘└┘ ┴ 
                                                  
🛡️  Autonomous AI Penetration Tester
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
"""
    print(banner)


def print_help():
    """Print usage information"""
    help_text = """
USAGE:
    python run_cli.py [--help]

DESCRIPTION:
    HackrAct AI Agent - An autonomous penetration testing agent
    powered by AI. Capable of running security tools, finding
    vulnerabilities, and documenting findings.

CONFIGURATION:
    Copy .env.example to .env and configure:
    - API_KEY: Your LLM provider API key
    - CHAT_MODEL: Model to use (default: anthropic/claude-3.5-sonnet)
    
COMMANDS (during session):
    - Type your request (e.g., "Scan 192.168.1.1 for open ports")
    - Type 'exit', 'quit', or 'q' to exit
    - Press Ctrl+C to interrupt

EXAMPLES:
    • "Scan localhost for open ports"
    • "Test http://example.com for SQL injection"
    • "Find vulnerabilities in 192.168.1.0/24"
    • "Recall exploits for MySQL"
    • "What tools are available for password cracking?"

ETHICAL USE:
    Only use this tool on systems you have explicit permission to test.
    Unauthorized access to computer systems is illegal.

For more information, see README.md
"""
    print(help_text)


async def main():
    """Main entry point"""
    
    # Check for help flag
    if '--help' in sys.argv or '-h' in sys.argv:
        print_help()
        return
    
    # Print banner
    print_banner()
    
    # Check for .env file
    if not os.path.exists('.env'):
        print("⚠️  Warning: .env file not found!")
        print("   Copy .env.example to .env and configure your API key\n")
        
        # Only prompt if we're in an interactive terminal
        if sys.stdin.isatty():
            response = input("Continue anyway? (y/n): ").strip().lower()
            if response != 'y':
                print("Exiting...")
                return
        else:
            print("⚠️  Running in non-interactive mode. Exiting...")
            print("   Please create .env file before running.\n")
            return
    
    try:
        # Create and run agent
        agent = Agent()
        await agent.run_interactive()
        
    except KeyboardInterrupt:
        print("\n\n👋 Goodbye!\n")
    except Exception as e:
        print(f"\n❌ Fatal Error: {str(e)}")
        print("Check your configuration and try again.\n")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
