# Multi-Provider LLM Configuration Guide

HackrAct AI Agent supports multiple LLM providers including cloud APIs and local models. This guide will help you configure your preferred provider.

## 📋 Table of Contents

- [Supported Providers](#supported-providers)
- [Configuration Examples](#configuration-examples)
- [Provider-Specific Setup](#provider-specific-setup)
- [Recommended Models](#recommended-models)
- [Troubleshooting](#troubleshooting)

---

## 🎯 Supported Providers

| Provider | Type | API Key Required | Best For |
|----------|------|------------------|----------|
| **OpenRouter** | Cloud | ✅ Yes | Access to multiple models (recommended) |
| **OpenAI** | Cloud | ✅ Yes | GPT-4, GPT-3.5 models |
| **Anthropic** | Cloud | ✅ Yes | Claude models directly |
| **Ollama** | Local | ❌ No | Privacy, offline use, no cost |
| **NVIDIA NIM** | Cloud | ✅ Yes | NVIDIA-hosted open models |
| **Custom** | Variable | Depends | Self-hosted or other APIs |

---

## ⚙️ Configuration Examples

### 1. OpenRouter (Recommended for Beginners)

OpenRouter provides access to multiple LLM providers through a single API key.

**`.env` Configuration:**
```bash
LLM_PROVIDER=openrouter
API_KEY=sk-or-v1-your-api-key-here
CHAT_MODEL=anthropic/claude-3.5-sonnet
UTILITY_MODEL=anthropic/claude-3-haiku
EMBEDDING_MODEL=text-embedding-3-small
```

**Available Models:**
- `anthropic/claude-3.5-sonnet` - Best for complex reasoning
- `anthropic/claude-3-opus` - Most capable
- `openai/gpt-4-turbo` - OpenAI's latest
- `google/gemini-pro-1.5` - Google's model
- `meta-llama/llama-3.1-70b-instruct` - Open source

**Get API Key:** [https://openrouter.ai/keys](https://openrouter.ai/keys)

---

### 2. OpenAI

Direct access to OpenAI models.

**`.env` Configuration:**
```bash
LLM_PROVIDER=openai
API_KEY=sk-your-openai-api-key-here
CHAT_MODEL=gpt-4-turbo-preview
UTILITY_MODEL=gpt-3.5-turbo
EMBEDDING_MODEL=text-embedding-3-small
```

**Available Models:**
- `gpt-4-turbo-preview` - Latest GPT-4
- `gpt-4` - Standard GPT-4
- `gpt-3.5-turbo` - Fast and cost-effective

**Get API Key:** [https://platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

### 3. Anthropic

Direct access to Claude models.

**`.env` Configuration:**
```bash
LLM_PROVIDER=anthropic
API_KEY=sk-ant-your-anthropic-api-key-here
CHAT_MODEL=claude-3-opus-20240229
UTILITY_MODEL=claude-3-haiku-20240307
EMBEDDING_MODEL=text-embedding-3-small
```

**Available Models:**
- `claude-3-opus-20240229` - Most capable
- `claude-3-sonnet-20240229` - Balanced performance
- `claude-3-haiku-20240307` - Fast and affordable

**Note:** You'll still need an OpenAI API key for embeddings, or use Ollama embeddings.

**Get API Key:** [https://console.anthropic.com/](https://console.anthropic.com/)

---

### 4. Ollama (Local Models)

Run models locally on your machine - completely free and private!

**Step 1: Install Ollama**

Download from [https://ollama.ai](https://ollama.ai) or:

```bash
# Linux/Mac
curl -fsSL https://ollama.ai/install.sh | sh

# Windows
# Download installer from https://ollama.ai/download
```

**Step 2: Pull Models**

```bash
# For chat (choose one based on your hardware)
ollama pull llama3.1:70b      # Best quality (requires 40GB+ RAM)
ollama pull llama3.1:8b       # Good balance (8GB+ RAM)
ollama pull mistral:7b        # Fast (8GB+ RAM)
ollama pull codellama:13b     # Code-focused

# For embeddings
ollama pull nomic-embed-text  # Recommended for memory/search
```

**Step 3: Configure `.env`**

```bash
LLM_PROVIDER=ollama
# No API key needed!
CHAT_MODEL=llama3.1:8b
UTILITY_MODEL=llama3.1:8b
EMBEDDING_MODEL=nomic-embed-text

# Only change if Ollama runs on different address
OLLAMA_BASE_URL=http://localhost:11434
```

**Step 4: Start Ollama**

Ollama usually runs automatically. If not:
```bash
ollama serve
```

**Advantages:**
- ✅ Completely free
- ✅ Total privacy (no data sent to cloud)
- ✅ Works offline
- ✅ No API limits

**Considerations:**
- Requires good hardware (see model requirements)
- May be slower than cloud APIs
- Limited to open-source models

---

### 5. NVIDIA NIM

NVIDIA NIM provides hosted inference for a range of open models.

**`.env` Configuration:**
```bash
LLM_PROVIDER=nvidia_nim
API_KEY=nvapi-your-nvidia-api-key
CHAT_MODEL=meta/llama-3.1-70b-instruct
UTILITY_MODEL=meta/llama-3.1-8b-instruct
```

**Notes:**
- LiteLLM routes these through the `nvidia_nim` provider.
- You can override the model names with any NVIDIA NIM model your account can access.

---

### 6. Custom API Endpoint

For self-hosted models or alternative providers.

**`.env` Configuration:**
```bash
LLM_PROVIDER=custom
API_KEY=your-custom-api-key-if-needed
CHAT_MODEL=your-model-name
UTILITY_MODEL=your-utility-model
CUSTOM_API_BASE=https://your-api-endpoint.com/v1
```

---

## 🎯 Recommended Models by Use Case

### For Best Quality (Cloud)
```bash
LLM_PROVIDER=openrouter
CHAT_MODEL=anthropic/claude-3-opus
UTILITY_MODEL=anthropic/claude-3-haiku
```

### For Cost-Effective (Cloud)
```bash
LLM_PROVIDER=openrouter
CHAT_MODEL=anthropic/claude-3-haiku
UTILITY_MODEL=anthropic/claude-3-haiku
```

### For Privacy (Local)
```bash
LLM_PROVIDER=ollama
CHAT_MODEL=llama3.1:8b
UTILITY_MODEL=llama3.1:8b
EMBEDDING_MODEL=nomic-embed-text
```

### For Coding Tasks (Local)
```bash
LLM_PROVIDER=ollama
CHAT_MODEL=codellama:13b
UTILITY_MODEL=codellama:7b
```

---

## 🔧 Complete Configuration Example

Here's a complete `.env` file with all options:

```bash
# =========================================
# LLM Provider Configuration
# =========================================
# Choose: openrouter, openai, anthropic, ollama, custom
LLM_PROVIDER=ollama

# API Key (not needed for Ollama)
API_KEY=

# =========================================
# Model Selection
# =========================================
CHAT_MODEL=llama3.1:8b
UTILITY_MODEL=llama3.1:8b
EMBEDDING_MODEL=nomic-embed-text

# =========================================
# Provider-Specific Settings
# =========================================
# For Ollama
OLLAMA_BASE_URL=http://localhost:11434

# For Custom API
CUSTOM_API_BASE=

# =========================================
# Memory Configuration
# =========================================
MEMORY_DIR=./memory
MEMORY_ENABLED=true

# =========================================
# Code Execution
# =========================================
CODE_EXEC_SSH_ENABLED=false
CODE_EXEC_SSH_ADDR=localhost
CODE_EXEC_SSH_PORT=22
CODE_EXEC_SSH_USER=root
CODE_EXEC_SSH_PASS=

# =========================================
# Agent Configuration
# =========================================
AGENT_NAME=HackrAct
MAX_ITERATIONS=25
TEMPERATURE=0.7

# =========================================
# Logging
# =========================================
LOG_LEVEL=INFO
LOG_DIR=./logs
```

---

## 🐛 Troubleshooting

### Ollama Connection Issues

**Problem:** "Connection refused" or "cannot connect to Ollama"

**Solutions:**
1. Ensure Ollama is running: `ollama serve`
2. Verify the URL: `curl http://localhost:11434/api/tags`
3. Check if model is pulled: `ollama list`
4. Try pulling the model again: `ollama pull llama3.1:8b`

### API Key Errors

**Problem:** "Invalid API key" or "Authentication failed"

**Solutions:**
1. Verify API key is correct (no extra spaces)
2. Check key has proper permissions
3. Ensure key is not expired
4. For OpenRouter: Verify you have credits

### Model Not Found

**Problem:** "Model not found" or "Invalid model"

**Solutions:**
1. For Ollama: Run `ollama pull <model-name>` first
2. For cloud APIs: Check model name spelling
3. Verify the model is available for your provider

### Performance Issues

**For Ollama:**
- Use smaller models (e.g., `llama3.1:8b` instead of `70b`)
- Ensure sufficient RAM
- Close other applications

**For Cloud APIs:**
- Check your internet connection
- Verify API status pages
- Consider rate limits

---

## 💡 Tips

1. **Start with Ollama** if you want to avoid costs and have decent hardware
2. **Use OpenRouter** for easiest access to multiple models
3. **Mix providers:** Use cloud for chat, Ollama for embeddings to save costs
4. **Test different models** to find the best balance of quality/speed/cost
5. **Monitor usage** on cloud providers to avoid unexpected bills

---

## 📚 Additional Resources

- **Ollama Models:** [https://ollama.ai/library](https://ollama.ai/library)
- **OpenRouter Pricing:** [https://openrouter.ai/docs#models](https://openrouter.ai/docs#models)
- **OpenAI Models:** [https://platform.openai.com/docs/models](https://platform.openai.com/docs/models)
- **Anthropic Models:** [https://docs.anthropic.com/claude/docs/models-overview](https://docs.anthropic.com/claude/docs/models-overview)
