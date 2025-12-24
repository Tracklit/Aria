"""
Minimal test for Azure OpenAI - direct API call without database
"""
import requests
import json

API_URL = "https://aria-dev-api.azurewebsites.net"

def test_openai_direct():
    """Test the /test/openai endpoint which directly calls OpenAI"""
    print("🔍 Testing Azure OpenAI via /test/openai endpoint...\n")
    
    question = "What is the best way to improve sprint speed?"
    
    try:
        print(f"Sending request to {API_URL}/test/openai...")
        response = requests.post(
            f"{API_URL}/test/openai",
            params={"question": question},
            headers={"Content-Type": "application/json"},
            timeout=45
        )
        
        print(f"Status Code: {response.status_code}\n")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS! Azure OpenAI is working!\n")
            print("=" * 60)
            print("Test Results:")
            print("=" * 60)
            print(f"Full Response: {json.dumps(result, indent=2)}")
            print("=" * 60)
            
            if result.get('answer'):
                print(f"\nQuestion: {result.get('question')}")
                print(f"Answer: {result.get('answer')}")
                print(f"Model: {result.get('model')}")
                print(f"Tokens Used: {result.get('tokens')}")
                print("\n✅ Azure OpenAI Integration: CONFIRMED WORKING ✅")
            else:
                print("\n⚠️  Got 200 but response seems incomplete")
            
            return True
            
        else:
            print(f"❌ Error: {response.status_code}")
            print(response.text)
            return False
            
    except requests.exceptions.Timeout:
        print("❌ Request timed out after 45 seconds")
        return False
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return False

if __name__ == "__main__":
    test_openai_direct()
