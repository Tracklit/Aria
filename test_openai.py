"""
Quick test script to verify OpenAI integration in deployed Aria API
"""
import requests
import json

API_URL = "https://aria-dev-api.azurewebsites.net"

def test_openai_integration():
    print("🔍 Testing OpenAI Integration...\n")
    
    # Test data
    payload = {
        "user_id": "test-user-openai",
        "user_input": "Give me one sprint training tip in 10 words or less"
    }
    
    try:
        print(f"Sending request to {API_URL}/ask...")
        response = requests.post(
            f"{API_URL}/ask",
            json=payload,
            headers={"Content-Type": "application/json"},
            timeout=45
        )
        
        print(f"Status Code: {response.status_code}\n")
        
        if response.status_code == 200:
            result = response.json()
            print("✅ SUCCESS! OpenAI API is working!\n")
            print("=" * 60)
            print("AI Response:")
            print("=" * 60)
            print(result.get("analysis", "No analysis field"))
            print("=" * 60)
            
            if "recommendation" in result:
                print(f"\nRecommendation: {result['recommendation'][:200]}...")
            
            print("\n✅ OpenAI Integration: CONFIRMED WORKING")
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
    test_openai_integration()
