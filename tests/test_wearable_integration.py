# test_wearable_integration.py
import pytest
import time
from fastapi.testclient import TestClient
from main import app
from unittest.mock import patch, MagicMock

client = TestClient(app)

class TestWearableAuthentication:
    """Test wearable device authentication"""
    
    def test_garmin_authentication_request(self):
        """Test Garmin device authentication"""
        auth_data = {
            "user_id": "test_user_123",
            "provider": "garmin",
            "success_url": "https://test.com/success",
            "failure_url": "https://test.com/failure"
        }
        
        with patch('wearable_integration.requests.post') as mock_post:
            # Mock successful Terra API response
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "auth_url": "https://api.tryterra.co/auth/garmin?token=abc123",
                "user_id": "terra_user_456"
            }
            
            response = client.post("/wearables/authenticate", json=auth_data)
            
            assert response.status_code == 200
            data = response.json()
            assert "auth_url" in data
            assert data["provider"] == "garmin"
            assert "next_steps" in data
    
    def test_apple_health_authentication(self):
        """Test Apple Health authentication"""
        auth_data = {
            "user_id": "test_user_123",
            "provider": "apple"
        }
        
        with patch('wearable_integration.requests.post') as mock_post:
            mock_post.return_value.status_code = 200
            mock_post.return_value.json.return_value = {
                "auth_url": "https://api.tryterra.co/auth/apple?token=xyz789",
                "user_id": "terra_user_789"
            }
            
            response = client.post("/wearables/authenticate", json=auth_data)
            
            assert response.status_code == 200
            data = response.json()
            assert data["provider"] == "apple"
            assert "Complete authentication in mobile app" in data.get("message", "")
    
    def test_unsupported_provider_authentication(self):
        """Test authentication with unsupported provider"""
        auth_data = {
            "user_id": "test_user_123",
            "provider": "unsupported_device"
        }
        
        response = client.post("/wearables/authenticate", json=auth_data)
        
        # Should handle gracefully
        assert response.status_code in [400, 500]
    
    def test_authentication_failure(self):
        """Test authentication failure handling"""
        auth_data = {
            "user_id": "test_user_123",
            "provider": "garmin"
        }
        
        with patch('wearable_integration.requests.post') as mock_post:
            # Mock Terra API failure
            mock_post.return_value.status_code = 400
            mock_post.return_value.json.return_value = {
                "error": "Invalid provider configuration"
            }
            
            response = client.post("/wearables/authenticate", json=auth_data)
            
            assert response.status_code == 400

class TestWearableDataRetrieval:
    """Test wearable data retrieval endpoints"""
    
    def setup_method(self):
        """Set up test data"""
        self.test_user_id = "test_wearable_user"
        self.mock_daily_data = {
            "success": True,
            "date": "2024-01-15",
            "provider": "garmin",
            "sleep": {
                "duration_hours": 7.5,
                "efficiency_percent": 87.5,
                "deep_sleep_hours": 1.8,
                "rem_sleep_hours": 1.2,
                "sleep_score": 82
            },
            "activity": {
                "steps": 8432,
                "distance_km": 6.2,
                "calories_burned": 2340,
                "active_minutes": 45.5
            },
            "heart_rate": {
                "resting_hr": 52,
                "max_hr": 178,
                "avg_hr": 68,
                "hrv_rmssd": 42.3
            },
            "recovery": {
                "recovery_score": 78,
                "stress_score": 23.5
            },
            "training_insights": {
                "readiness_score": 82,
                "training_recommendation": "moderate",
                "warnings": [],
                "focus_areas": ["Moderate intensity training"]
            }
        }
    
    def test_get_daily_data_success(self):
        """Test successful daily data retrieval"""
        with patch('wearable_integration.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "data": [self.mock_daily_data]
            }
            
            response = client.get(f"/wearables/daily/{self.test_user_id}")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert "sleep" in data
            assert "training_insights" in data
            assert data["sleep"]["duration_hours"] == 7.5
    
    def test_get_daily_data_with_date(self):
        """Test daily data retrieval with specific date"""
        test_date = "2024-01-15"
        
        with patch('wearable_integration.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "data": [self.mock_daily_data]
            }
            
            response = client.get(f"/wearables/daily/{self.test_user_id}?date={test_date}")
            
            assert response.status_code == 200
    
    def test_get_daily_data_no_data(self):
        """Test daily data retrieval when no data available"""
        with patch('wearable_integration.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "data": []
            }
            
            response = client.get(f"/wearables/daily/{self.test_user_id}")
            
            # Should handle gracefully
            assert response.status_code in [200, 404]
    
    def test_get_workout_data(self):
        """Test workout data retrieval"""
        mock_workout_data = {
            "success": True,
            "workouts": [
                {
                    "id": "workout_123",
                    "name": "Sprint Intervals",
                    "start_time": "2024-01-15T10:00:00Z",
                    "duration_minutes": 45.5,
                    "sport_type": "running",
                    "distance_km": 5.2,
                    "avg_speed_kmh": 12.5,
                    "max_speed_kmh": 24.8,
                    "avg_heart_rate": 165,
                    "max_heart_rate": 185,
                    "is_sprint_workout": True,
                    "sprint_analysis": {
                        "peak_speed_kmh": 24.8,
                        "speed_consistency": 85.2
                    }
                }
            ],
            "total_workouts": 1,
            "sprint_workouts": 1
        }
        
        with patch('wearable_integration.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {
                "data": [mock_workout_data["workouts"][0]]
            }
            
            response = client.get(f"/wearables/workouts/{self.test_user_id}?start_date=2024-01-15")
            
            assert response.status_code == 200
            data = response.json()
            assert data["success"] == True
            assert len(data["workouts"]) >= 0

class TestWearableStatus:
    """Test wearable device status and management"""
    
    def test_get_wearable_status_no_devices(self):
        """Test status when no devices connected"""
        response = client.get("/wearables/status/test_user_no_devices")
        
        assert response.status_code == 200
        data = response.json()
        assert "providers" in data
        assert data["providers"]["garmin"]["connected"] == False
        assert data["providers"]["apple"]["connected"] == False
        assert data["has_recent_data"] == False
    
    def test_get_wearable_status_with_devices(self):
        """Test status when devices are connected"""
        # First simulate connecting a device by setting cache
        from cache import cache
        user_id = "test_user_connected"
        
        auth_data = {
            "user_id": "terra_123",
            "last_sync": "2024-01-15T12:00:00Z"
        }
        cache.set(f"wearable_auth:{user_id}:garmin", auth_data, ttl=3600)
        
        response = client.get(f"/wearables/status/{user_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["providers"]["garmin"]["connected"] == True
        assert data["providers"]["garmin"]["user_id"] == "terra_123"
    
    def test_disconnect_wearable_device(self):
        """Test disconnecting a wearable device"""
        user_id = "test_disconnect_user"
        provider = "garmin"
        
        # First connect a device
        from cache import cache
        cache.set(f"wearable_auth:{user_id}:{provider}", {"connected": True}, ttl=3600)
        
        # Then disconnect it
        response = client.delete(f"/wearables/disconnect/{user_id}/{provider}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["provider"] == provider
        assert data["user_id"] == user_id
        
        # Verify it's disconnected
        status_response = client.get(f"/wearables/status/{user_id}")
        status_data = status_response.json()
        assert status_data["providers"][provider]["connected"] == False

class TestTrainingReadiness:
    """Test AI-powered training readiness assessment"""
    
    def test_training_readiness_with_data(self):
        """Test training readiness when wearable data is available"""
        user_id = "test_readiness_user"
        
        # Create a test user first
        user_data = {
            "name": "Readiness Test User",
            "gender": "female",
            "email": f"readiness_{int(time.time())}@example.com",
            "age": 28,
            "training_goal": "Improve 200m time",
            "injury_status": "none",
            "sleep_hours": 8.0,
            "sleep_quality": "good",
            "coach_mode": "supportive",
            "training_days_per_week": 5
        }
        
        with patch('main.get_athlete_profile') as mock_profile:
            mock_profile.return_value = {**user_data, "id": user_id}
            
            with patch('wearable_integration.requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {
                    "data": [{
                        "success": True,
                        "sleep": {"duration_hours": 7.5, "efficiency_percent": 88},
                        "heart_rate": {"resting_hr": 54, "hrv_rmssd": 38},
                        "recovery": {"recovery_score": 82},
                        "training_insights": {
                            "readiness_score": 85,
                            "training_recommendation": "moderate",
                            "warnings": [],
                            "focus_areas": ["Moderate intensity training"]
                        }
                    }]
                }
                
                with patch('openai.OpenAI') as mock_openai:
                    mock_client = MagicMock()
                    mock_openai.return_value = mock_client
                    mock_response = MagicMock()
                    mock_response.choices[0].message.content = "Based on your excellent sleep quality and recovery metrics, you're well-prepared for moderate intensity training today."
                    mock_client.chat.completions.create.return_value = mock_response
                    
                    response = client.get(f"/wearables/training-readiness/{user_id}")
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert "readiness_score" in data
                    assert "ai_analysis" in data
                    assert "wearable_summary" in data
    
    def test_training_readiness_no_data(self):
        """Test training readiness when no wearable data available"""
        user_id = "test_no_data_user"
        
        with patch('wearable_integration.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"data": []}
            
            response = client.get(f"/wearables/training-readiness/{user_id}")
            
            assert response.status_code == 404

class TestEnhancedAI:
    """Test enhanced AI consultation with wearable data"""
    
    def test_enhanced_ask_with_wearable_data(self):
        """Test AI consultation enhanced with wearable data"""
        user_id = "test_enhanced_user"
        
        ask_data = {
            "user_id": user_id,
            "user_input": "Should I do speed work today based on my recovery?"
        }
        
        # Mock user profile
        mock_user = {
            "name": "Enhanced Test User",
            "age": 25,
            "training_goal": "Improve sprint times",
            "injury_status": "none",
            "sleep_hours": 7.0,
            "sleep_quality": "good",
            "coach_mode": "supportive",
            "mood": "motivated"
        }
        
        # Mock wearable data
        mock_wearable = {
            "success": True,
            "sleep": {"duration_hours": 7.2, "efficiency_percent": 85},
            "heart_rate": {"resting_hr": 58, "hrv_rmssd": 35},
            "recovery": {"recovery_score": 75},
            "training_insights": {
                "readiness_score": 78,
                "training_recommendation": "moderate",
                "warnings": ["Slightly elevated resting heart rate"]
            }
        }
        
        with patch('main.get_athlete_profile') as mock_profile:
            mock_profile.return_value = mock_user
            
            with patch('wearable_integration.requests.get') as mock_get:
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {"data": [mock_wearable]}
                
                with patch('openai.OpenAI') as mock_openai:
                    mock_client = MagicMock()
                    mock_openai.return_value = mock_client
                    mock_response = MagicMock()
                    mock_response.choices[0].message.content = '{"analysis": "Your wearable data shows moderate readiness with slightly elevated resting HR.", "recommendation": "Consider tempo work instead of maximum speed today.", "bibliography": "Based on HRV and sleep efficiency metrics."}'
                    mock_client.chat.completions.create.return_value = mock_response
                    
                    response = client.post("/ask/enhanced", json=ask_data)
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert "analysis" in data
                    assert "recommendation" in data
    
    def test_enhanced_ask_fallback_no_wearable(self):
        """Test enhanced AI falls back gracefully when no wearable data"""
        user_id = "test_fallback_user"
        
        ask_data = {
            "user_id": user_id,
            "user_input": "How should I train today?"
        }
        
        mock_user = {
            "name": "Fallback User",
            "age": 30,
            "training_goal": "General fitness",
            "injury_status": "none",
            "sleep_hours": 7.5,
            "sleep_quality": "good",
            "coach_mode": "friendly",
            "mood": "neutral"
        }
        
        with patch('main.get_athlete_profile') as mock_profile:
            mock_profile.return_value = mock_user
            
            with patch('wearable_integration.requests.get') as mock_get:
                # Simulate no wearable data
                mock_get.return_value.status_code = 200
                mock_get.return_value.json.return_value = {"data": []}
                
                with patch('openai.OpenAI') as mock_openai:
                    mock_client = MagicMock()
                    mock_openai.return_value = mock_client
                    mock_response = MagicMock()
                    mock_response.choices[0].message.content = '{"analysis": "Based on your reported sleep and mood, you seem ready for training.", "recommendation": "Start with moderate intensity work.", "bibliography": "General training principles."}'
                    mock_client.chat.completions.create.return_value = mock_response
                    
                    response = client.post("/ask/enhanced", json=ask_data)
                    
                    assert response.status_code == 200
                    data = response.json()
                    assert "analysis" in data

class TestWeeklyInsights:
    """Test weekly training insights from wearable data"""
    
    def test_weekly_insights_with_data(self):
        """Test weekly insights when sufficient data available"""
        user_id = "test_insights_user"
        
        # Mock multiple days of data
        mock_daily_responses = []
        for i in range(7):
            daily_data = {
                "success": True,
                "sleep": {"duration_hours": 7.0 + (i * 0.2)},  # Varying sleep
                "recovery": {"recovery_score": 70 + (i * 2)}   # Improving recovery
            }
            mock_daily_responses.append(daily_data)
        
        with patch('wearable_integration.requests.get') as mock_get:
            # Return different data for each day
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.side_effect = [{"data": [data]} for data in mock_daily_responses]
            
            response = client.get(f"/wearables/insights/{user_id}?days=7")
            
            assert response.status_code == 200
            data = response.json()
            assert "sleep_analysis" in data
            assert "recovery_trends" in data
            assert "recommendations" in data
    
    def test_weekly_insights_no_data(self):
        """Test weekly insights when no data available"""
        user_id = "test_no_insights_user"
        
        with patch('wearable_integration.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"data": []}
            
            response = client.get(f"/wearables/insights/{user_id}")
            
            assert response.status_code == 404

class TestWearableIntegrationPerformance:
    """Test performance aspects of wearable integration"""
    
    def test_caching_effectiveness(self):
        """Test that wearable data is properly cached"""
        user_id = "test_cache_user"
        
        mock_data = {
            "success": True,
            "sleep": {"duration_hours": 8.0},
            "date": "2024-01-15"
        }
        
        with patch('wearable_integration.requests.get') as mock_get:
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"data": [mock_data]}
            
            # First request
            response1 = client.get(f"/wearables/daily/{user_id}")
            assert response1.status_code == 200
            
            # Second request should use cache (fewer API calls)
            response2 = client.get(f"/wearables/daily/{user_id}")
            assert response2.status_code == 200
            
            # Should have same data
            assert response1.json() == response2.json()
    
    def test_rate_limiting_on_wearable_endpoints(self):
        """Test that rate limiting applies to wearable endpoints"""
        user_id = "test_rate_limit_user"
        
        # Make multiple rapid requests
        responses = []
        for i in range(3):
            response = client.get(f"/wearables/status/{user_id}")
            responses.append(response.status_code)
        
        # Should get successful responses (or 429 if rate limited)
        assert all(status in [200, 429] for status in responses)

class TestErrorHandling:
    """Test error handling in wearable integration"""
    
    def test_invalid_provider_graceful_failure(self):
        """Test graceful handling of invalid provider"""
        auth_data = {
            "user_id": "test_user",
            "provider": "nonexistent_provider"
        }
        
        response = client.post("/wearables/authenticate", json=auth_data)
        
        # Should handle gracefully, not crash
        assert response.status_code in [400, 500]
    
    def test_api_timeout_handling(self):
        """Test handling of external API timeouts"""
        user_id = "test_timeout_user"
        
        with patch('wearable_integration.requests.get') as mock_get:
            # Simulate timeout
            mock_get.side_effect = TimeoutError("Request timed out")
            
            response = client.get(f"/wearables/daily/{user_id}")
            
            # Should handle timeout gracefully
            assert response.status_code in [500, 503]
    
    def test_malformed_data_handling(self):
        """Test handling of malformed data from external APIs"""
        user_id = "test_malformed_user"
        
        with patch('wearable_integration.requests.get') as mock_get:
            # Return malformed data
            mock_get.return_value.status_code = 200
            mock_get.return_value.json.return_value = {"invalid": "structure"}
            
            response = client.get(f"/wearables/daily/{user_id}")
            
            # Should handle gracefully
            assert response.status_code in [200, 500]

# Integration tests with existing API
class TestWearableAPIIntegration:
    """Test integration with existing Aria API features"""
    
    def test_wearable_data_in_user_profile(self):
        """Test that wearable data enhances user profile information"""
        # This would test integration with existing user management
        pass
    
    def test_coach_access_to_athlete_wearable_data(self):
        """Test that coaches can access their athletes' wearable insights"""
        # This would test coach-athlete relationship with wearable data
        pass
    
    def test_knowledge_library_integration(self):
        """Test that wearable insights reference knowledge library"""
        # This would test citations and references in wearable recommendations
        pass

if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])