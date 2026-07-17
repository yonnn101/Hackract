import requests

response = requests.post(
    "http://localhost:11434/api/generate",
    json={
        "model": "hackract-ai",
        "prompt": "Explain XSS vulnerability",
        "stream": False
    }
)

print(response.json())