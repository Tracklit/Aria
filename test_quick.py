"""Quick test of Azure OpenAI integration"""
import os
import sys
sys.path.insert(0, 'src')

# Load environment variables from .env file
try:
    from dotenv import load_dotenv
    load_dotenv()
    print("✅ Loaded .env file")
except ImportError:
    print("⚠️  python-dotenv not installed, trying without it...")

print("\nChecking environment configuration...")
print(f"AZURE_OPENAI_API_KEY: {'Set' if os.getenv('AZURE_OPENAI_API_KEY') else 'NOT SET'}")
print(f"AZURE_OPENAI_ENDPOINT: {os.getenv('AZURE_OPENAI_ENDPOINT', 'NOT SET')}")
print(f"AZURE_OPENAI_DEPLOYMENT: {os.getenv('AZURE_OPENAI_DEPLOYMENT', 'NOT SET')}")
print(f"OPENAI_API_KEY: {'Set' if os.getenv('OPENAI_API_KEY') else 'NOT SET'}")
print()

# Check if using regular OpenAI instead
if os.getenv('OPENAI_API_KEY'):
    print("Found OPENAI_API_KEY - testing standard OpenAI...")
    from openai import OpenAI
    
    try:
        client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[{"role": "user", "content": "Say 'Hello' if you can hear me"}],
            max_tokens=50
        )
        print(f"✅ OpenAI Success! Response: {response.choices[0].message.content}")
    except Exception as e:
        print(f"❌ OpenAI Error: {type(e).__name__}: {str(e)}")
else:
    print("❌ No API keys configured")
