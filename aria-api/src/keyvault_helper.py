"""
Key Vault Helper for resolving unresolved Key Vault references
Handles cases where Azure App Service doesn't automatically resolve @Microsoft.KeyVault references
"""

import os
import re
import logging
from typing import Optional

logger = logging.getLogger(__name__)

def resolve_keyvault_reference(value: Optional[str]) -> Optional[str]:
    """
    Resolve Key Vault reference if it wasn't automatically resolved by App Service.
    
    Args:
        value: Environment variable value that might contain @Microsoft.KeyVault reference
        
    Returns:
        Resolved secret value or original value if not a Key Vault reference
    """
    if not value or not value.startswith("@Microsoft.KeyVault("):
        return value
    
    # Extract the secret URI from the reference
    match = re.match(r'@Microsoft\.KeyVault\(SecretUri=([^)]+)\)', value)
    if not match:
        logger.error(f"Failed to parse Key Vault reference: {value}")
        return value
    
    secret_uri = match.group(1)
    logger.info(f"Resolving Key Vault reference: {secret_uri}")
    
    try:
        # Use Azure Identity to authenticate with managed identity
        from azure.identity import DefaultAzureCredential
        from azure.keyvault.secrets import SecretClient
        
        # Parse vault URL from secret URI (e.g., https://vault.vault.azure.net/secrets/secret-name/)
        vault_match = re.match(r'(https://[^/]+)/', secret_uri)
        if not vault_match:
            logger.error(f"Failed to extract vault URL from: {secret_uri}")
            return value
        
        vault_url = vault_match.group(1)
        secret_name_match = re.match(r'https://[^/]+/secrets/([^/]+)', secret_uri)
        if not secret_name_match:
            logger.error(f"Failed to extract secret name from: {secret_uri}")
            return value
            
        secret_name = secret_name_match.group(1)
        
        # Create credential and secret client
        credential = DefaultAzureCredential()
        client = SecretClient(vault_url=vault_url, credential=credential)
        
        # Retrieve the secret
        secret = client.get_secret(secret_name)
        logger.info(f"Successfully resolved Key Vault reference for: {secret_name}")
        return secret.value
        
    except ImportError:
        logger.error("azure-identity or azure-keyvault-secrets not installed")
        return value
    except Exception as e:
        logger.error(f"Failed to resolve Key Vault reference: {e}")
        return value


def get_env_with_keyvault_resolution(key: str, default: Optional[str] = None) -> Optional[str]:
    """
    Get environment variable with automatic Key Vault reference resolution.
    
    Args:
        key: Environment variable name
        default: Default value if not found
        
    Returns:
        Resolved value
    """
    value = os.getenv(key, default)
    return resolve_keyvault_reference(value)
