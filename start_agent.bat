@echo off
echo Starting HackrAct AI Agent Server...
cd AI_Agent
if not exist .venv\Scripts\activate (
    echo Virtual environment not found. Please run "python -m venv .venv" and install requirements.
    pause
    exit /b
)
call .venv\Scripts\activate
python api_server.py
pause
