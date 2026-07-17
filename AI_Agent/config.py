"""Configuration management for HackrAct AI Agent"""

import os
from dataclasses import dataclass, field
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class ConfigValidationError(ValueError):
    """Raised when required config is missing or invalid."""
    pass


@dataclass
class ModelConfig:
    """Configuration for AI models"""
    provider: str = "openrouter"
    api_key: str = ""
    chat_model: str = "anthropic/claude-3.5-sonnet"
    utility_model: str = "anthropic/claude-3-haiku"
    embedding_model: str = "text-embedding-3-small"
    temperature: float = 0.7
    max_tokens: int = 4096
    max_context_tokens: int = 128000 # Default large context
    
    # Provider-specific settings
    ollama_base_url: str = "http://localhost:11434"
    custom_api_base: str = ""


@dataclass
class MemoryConfig:
    """Configuration for memory system"""
    enabled: bool = True
    memory_dir: str = "./memory"
    collection_name: str = "hackract_memory"
    max_results: int = 10
    # Fallback embedding dimension when embedding API fails (must match your embedding model; 1536 for OpenAI text-embedding-3-*)
    embedding_fallback_dimension: int = 1536


@dataclass
class CodeExecutionConfig:
    """Configuration for code execution"""
    ssh_enabled: bool = False
    ssh_addr: str = "localhost"
    ssh_port: int = 22
    ssh_user: str = "root"
    ssh_pass: str = ""
    timeout: int = 300  # 5 minutes default
    require_approval: bool = True  # Require human approval for dangerous commands
    dangerous_keywords: list = field(default_factory=lambda: [
        "rm -rf", "mkfs", "dd", ":(){:|:&};:", "nc", "ncat", "bash -i", "python -c", "exploit"
    ])
    forbidden_patterns: list = field(default_factory=lambda: [
        "rm -rf /", "rm -rf /bin", "rm -rf /etc", "rm -rf /usr", 
        "> agent.py", "> config.py", "rm agent.py", "rm config.py",
        "mv agent.py", "mv config.py", "python/tools/", "python/helpers/"
    ])


@dataclass
class AgentConfig:
    """Main agent configuration"""
    name: str = "HackrAct"
    max_iterations: int = 25
    log_level: str = "INFO"
    log_dir: str = "./logs"
    work_dir: str = "./work_dir"
    prompts_dir: str = "./prompts"
    instruments_dir: str = "./instruments"
    
    # Sub-configurations
    model: ModelConfig = field(default_factory=ModelConfig)
    memory: MemoryConfig = field(default_factory=MemoryConfig)
    code_exec: CodeExecutionConfig = field(default_factory=CodeExecutionConfig)
    
    additional: Dict[str, Any] = field(default_factory=dict)


def load_config(validate: bool = True) -> AgentConfig:
    """Load configuration from environment variables. Set validate=False to allow startup without API key (e.g. configure via UI)."""
    # Reload environment variables from .env (overriding existing) so runtime updates are picked up
    load_dotenv(override=True)
    
    # Smart defaults for provider and models
    provider = os.getenv("LLM_PROVIDER")
    api_key = os.getenv("API_KEY", "")
    
    if not provider:
        # Auto-detect provider based on keys if not explicitly set
        if os.getenv("GEMINI_API_KEY"):
            provider = "gemini"
            api_key = os.getenv("GEMINI_API_KEY")
        elif os.getenv("ANTHROPIC_API_KEY"):
            provider = "anthropic"
            api_key = os.getenv("ANTHROPIC_API_KEY")
        elif os.getenv("GITHUB_TOKEN") and not (api_key or "").strip():
            provider = "github"
            api_key = os.getenv("GITHUB_TOKEN", "")
        elif os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_NIM_API_KEY"):
            provider = "nvidia_nim"
            api_key = os.getenv("NVIDIA_API_KEY") or os.getenv("NVIDIA_NIM_API_KEY", "")
        elif os.getenv("OPENAI_API_KEY"):
            provider = "openai"
            api_key = os.getenv("OPENAI_API_KEY")
        else:
            provider = "openrouter"

    # Smart defaults for models based on provider
    default_chat_model = "anthropic/claude-3.5-sonnet"
    default_utility_model = "anthropic/claude-3-haiku"
    default_context_tokens = 128000
    
    if provider == "gemini":
        default_chat_model = "gemini/gemini-1.5-pro"
        default_utility_model = "gemini/gemini-1.5-flash"
        default_context_tokens = 1000000
    elif provider == "github":
        default_chat_model = "gpt-4o"
        default_utility_model = "gpt-4o-mini"
        # GitHub Models hard limit ~8000 *input* tokens per request; stay under with margin
        default_context_tokens = int(os.getenv("GITHUB_MAX_CONTEXT_TOKENS_DEFAULT", "4500"))
    elif provider == "nvidia_nim":
        default_chat_model = "meta/llama-3.1-70b-instruct"
        default_utility_model = "meta/llama-3.1-8b-instruct"
        default_context_tokens = 128000
    elif provider == "openai":
        default_chat_model = "gpt-4o"
        default_utility_model = "gpt-3.5-turbo"
        default_context_tokens = 128000
    elif provider == "ollama":
        default_chat_model = "llama3"
        default_utility_model = "llama3"
        default_context_tokens = 8000

    # GitHub Models: allow GITHUB_TOKEN when API_KEY is empty
    if provider == "github" and not (api_key or "").strip():
        api_key = os.getenv("GITHUB_TOKEN", "") or api_key

    model_config = ModelConfig(
        provider=provider,
        api_key=api_key,
        chat_model=os.getenv("CHAT_MODEL", default_chat_model),
        utility_model=os.getenv("UTILITY_MODEL", default_utility_model),
        embedding_model=os.getenv("EMBEDDING_MODEL", "text-embedding-3-small"),
        temperature=float(os.getenv("TEMPERATURE", "0.7")),
        max_tokens=int(os.getenv("MAX_TOKENS", "4096")),
        max_context_tokens=int(os.getenv("MAX_CONTEXT_TOKENS", str(default_context_tokens))),
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        custom_api_base=os.getenv("CUSTOM_API_BASE", ""),
    )

    # GitHub Models: enforce API limits (input ~8000 tokens; completion budget separate)
    if model_config.provider == "github":
        gh_ctx_cap = int(os.getenv("GITHUB_MAX_CONTEXT_TOKENS", "4500"))
        gh_out_cap = int(os.getenv("GITHUB_MAX_COMPLETION_TOKENS", "1536"))
        model_config.max_context_tokens = min(model_config.max_context_tokens, gh_ctx_cap)
        model_config.max_tokens = min(model_config.max_tokens, gh_out_cap)
    
    memory_config = MemoryConfig(
        enabled=os.getenv("MEMORY_ENABLED", "true").lower() == "true",
        memory_dir=os.getenv("MEMORY_DIR", "./memory"),
        collection_name=os.getenv("MEMORY_COLLECTION", "hackract_memory"),
        embedding_fallback_dimension=int(os.getenv("EMBEDDING_FALLBACK_DIMENSION", "1536")),
    )
    
    code_exec_config = CodeExecutionConfig(
        ssh_enabled=os.getenv("CODE_EXEC_SSH_ENABLED", "false").lower() == "true",
        ssh_addr=os.getenv("CODE_EXEC_SSH_ADDR", "localhost"),
        ssh_port=int(os.getenv("CODE_EXEC_SSH_PORT", "22")),
        ssh_user=os.getenv("CODE_EXEC_SSH_USER", "root"),
        ssh_pass=os.getenv("CODE_EXEC_SSH_PASS", ""),
        require_approval=os.getenv("REQUIRE_APPROVAL", "true").lower() == "true",
    )
    
    agent_name = os.getenv("AGENT_NAME", "HackrAct")
    log_dir = os.getenv("LOG_DIR", "./logs")

    if validate:
        # Validate: non-Ollama providers require an API key
        if model_config.provider != "ollama" and not (model_config.api_key or "").strip():
            raise ConfigValidationError(
                f"API key is required for provider '{model_config.provider}'. "
                "Set API_KEY in .env or the provider-specific key (e.g. OPENAI_API_KEY, ANTHROPIC_API_KEY, NVIDIA_API_KEY)."
            )
        # Validate numeric ranges
        if model_config.max_tokens < 1 or model_config.max_tokens > 128000:
            raise ConfigValidationError("MAX_TOKENS must be between 1 and 128000.")
        if not (0 <= model_config.temperature <= 2):
            raise ConfigValidationError("TEMPERATURE must be between 0 and 2.")
        if model_config.max_context_tokens < 1000:
            raise ConfigValidationError("MAX_CONTEXT_TOKENS must be at least 1000.")

    return AgentConfig(
        model=model_config, 
        memory=memory_config, 
        code_exec=code_exec_config, 
        name=agent_name, 
        log_dir=log_dir
    )


def save_config_to_env(config_dict: dict) -> bool:
    """
    Save configuration dictionary to .env file
    
    Args:
        config_dict: Dictionary with configuration values
    
    Returns:
        bool: True if successful
    
    Note:
        If ``api_key`` is missing or empty/whitespace, the existing ``API_KEY`` in .env
        is left unchanged (so the Settings UI can omit the secret when saving other fields).
    """
    from pathlib import Path

    config_dict = dict(config_dict)
    # Never wipe API_KEY when the form sends an empty password field
    if not str(config_dict.get("api_key", "") or "").strip():
        config_dict.pop("api_key", None)
    
    env_path = Path(".env")
    
    # Read existing .env file (utf-8 for non-ASCII values)
    env_lines = []
    if env_path.exists():
        with open(env_path, 'r', encoding='utf-8') as f:
            env_lines = f.readlines()
    
    # Update values
    updated = set()
    new_lines = []
    
    for line in env_lines:
        line = line.strip()
        if not line or line.startswith('#'):
            new_lines.append(line)
            continue
        
        if '=' in line:
            key = line.split('=')[0].strip()
            
            # Check if this key should be updated
            if key == 'LLM_PROVIDER' and 'llm_provider' in config_dict:
                new_lines.append(f'LLM_PROVIDER={config_dict["llm_provider"]}')
                updated.add('llm_provider')
            elif key == 'API_KEY' and 'api_key' in config_dict:
                new_lines.append(f'API_KEY={config_dict["api_key"]}')
                updated.add('api_key')
            elif key == 'CHAT_MODEL' and 'chat_model' in config_dict:
                new_lines.append(f'CHAT_MODEL={config_dict["chat_model"]}')
                updated.add('chat_model')
            elif key == 'UTILITY_MODEL' and 'utility_model' in config_dict:
                new_lines.append(f'UTILITY_MODEL={config_dict["utility_model"]}')
                updated.add('utility_model')
            elif key == 'CUSTOM_API_BASE' and 'custom_endpoint' in config_dict:
                new_lines.append(f'CUSTOM_API_BASE={config_dict["custom_endpoint"]}')
                updated.add('custom_endpoint')
            elif key == 'MEMORY_ENABLED' and 'memory_enabled' in config_dict:
                new_lines.append(f'MEMORY_ENABLED={str(config_dict["memory_enabled"]).lower()}')
                updated.add('memory_enabled')
            elif key == 'MEMORY_COLLECTION' and 'collection_name' in config_dict:
                new_lines.append(f'MEMORY_COLLECTION={config_dict["collection_name"]}')
                updated.add('collection_name')
            elif key == 'EMBEDDING_MODEL' and 'embedding_model' in config_dict:
                new_lines.append(f'EMBEDDING_MODEL={config_dict["embedding_model"]}')
                updated.add('embedding_model')
            elif key == 'TEMPERATURE' and 'temperature' in config_dict:
                new_lines.append(f'TEMPERATURE={config_dict["temperature"]}')
                updated.add('temperature')
            elif key == 'MAX_TOKENS' and 'max_tokens' in config_dict:
                new_lines.append(f'MAX_TOKENS={config_dict["max_tokens"]}')
                updated.add('max_tokens')
            else:
                new_lines.append(line)
        else:
            new_lines.append(line)
    
    # Add any new keys that weren't in the file
    if 'llm_provider' in config_dict and 'llm_provider' not in updated:
        new_lines.append(f'LLM_PROVIDER={config_dict["llm_provider"]}')
    if 'api_key' in config_dict and 'api_key' not in updated:
        new_lines.append(f'API_KEY={config_dict["api_key"]}')
    if 'chat_model' in config_dict and 'chat_model' not in updated:
        new_lines.append(f'CHAT_MODEL={config_dict["chat_model"]}')
    if 'utility_model' in config_dict and 'utility_model' not in updated:
        new_lines.append(f'UTILITY_MODEL={config_dict["utility_model"]}')
    if 'custom_endpoint' in config_dict and 'custom_endpoint' not in updated:
        new_lines.append(f'CUSTOM_API_BASE={config_dict["custom_endpoint"]}')
    if 'memory_enabled' in config_dict and 'memory_enabled' not in updated:
        new_lines.append(f'MEMORY_ENABLED={str(config_dict["memory_enabled"]).lower()}')
    if 'collection_name' in config_dict and 'collection_name' not in updated:
        new_lines.append(f'MEMORY_COLLECTION={config_dict["collection_name"]}')
    if 'embedding_model' in config_dict and 'embedding_model' not in updated:
        new_lines.append(f'EMBEDDING_MODEL={config_dict["embedding_model"]}')
    if 'temperature' in config_dict and 'temperature' not in updated:
        new_lines.append(f'TEMPERATURE={config_dict["temperature"]}')
    if 'max_tokens' in config_dict and 'max_tokens' not in updated:
        new_lines.append(f'MAX_TOKENS={config_dict["max_tokens"]}')
    
    # Write back to file (utf-8 for portability)
    with open(env_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(new_lines) + '\n')
    
    return True


# Global config instance (validate=False so server can start without .env; endpoints validate when needed)
CONFIG = load_config(validate=False)
