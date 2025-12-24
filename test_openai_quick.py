"""Quick test to verify Azure OpenAI API key authentication is working"""
import os
from openai import AzureOpenAI
from keyvault_helper import get_env_with_keyvault_resolution

print("Testing Azure OpenAI connection...")
print(f"Endpoint: {get_env_with_keyvault_resolution('AZURE_OPENAI_ENDPOINT')}")

try:
    client = AzureOpenAI(
        api_key=get_env_with_keyvault_resolution("AZURE_OPENAI_API_KEY"),
        api_version="2024-02-15-preview",
        azure_endpoint=get_env_with_keyvault_resolution("AZURE_OPENAI_ENDPOINT")
    )
    
    print("\n✓ Client initialized successfully")
    
    # Test with a simple completion
    deployment_name = get_env_with_keyvault_resolution("AZURE_OPENAI_DEPLOYMENT")
    print(f"Testing deployment: {deployment_name}")
    
    response = client.chat.completions.create(
        model=deployment_name,
        messages=[
            {"role": "user", "content": "Say 'Hello from Azure OpenAI!' in one sentence."}
        ],
        max_tokens=50
    )
    
    print("\n✓ API call successful!")
    print(f"\nResponse: {response.choices[0].message.content}")
    print(f"Model: {response.model}")
    print(f"Usage: {response.usage.total_tokens} tokens")
    
except Exception as e:
    print(f"\n✗ Error: {type(e).__name__}")
    print(f"Message: {str(e)}")
    import traceback
    traceback.print_exc()
