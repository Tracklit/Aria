# wearable_integration.py
import requests
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, List, Any
import logging
from src.cache import cache
import os

logger = logging.getLogger(__name__)

class WearableDataIntegrator:
    """Integration with Garmin Connect and Apple Health via third-party services"""
    
    def __init__(self):
        # Terra API credentials (handles multiple wearable integrations)
        self.terra_api_key = os.getenv("TERRA_API_KEY")
        self.terra_dev_id = os.getenv("TERRA_DEV_ID")
        self.terra_secret = os.getenv("TERRA_SECRET")
        
        # Fitbit (alternative integration)
        self.fitbit_client_id = os.getenv("FITBIT_CLIENT_ID")
        self.fitbit_client_secret = os.getenv("FITBIT_CLIENT_SECRET")
        
        self.base_url = "https://api.tryterra.co/v2"
        
    def get_auth_headers(self) -> Dict[str, str]:
        """Get headers for Terra API authentication"""
        return {
            "dev-id": self.terra_dev_id,
            "X-API-Key": self.terra_api_key,
            "Content-Type": "application/json"
        }
    
    async def authenticate_user_device(self, user_id: str, provider: str, auth_data: Dict) -> Dict[str, Any]:
        """
        Authenticate user with their wearable device provider
        
        Args:
            user_id: Aria user ID
            provider: 'garmin', 'apple', 'fitbit', 'polar', etc.
            auth_data: Provider-specific authentication data
            
        Returns:
            Authentication result with user tokens
        """
        try:
            if provider.lower() == "garmin":
                return await self._authenticate_garmin(user_id, auth_data)
            elif provider.lower() == "apple":
                return await self._authenticate_apple_health(user_id, auth_data)
            elif provider.lower() == "fitbit":
                return await self._authenticate_fitbit(user_id, auth_data)
            else:
                return {"success": False, "error": f"Provider {provider} not supported"}
                
        except Exception as e:
            logger.error(f"Authentication error for {provider}: {e}")
            return {"success": False, "error": str(e)}
    
    async def _authenticate_garmin(self, user_id: str, auth_data: Dict) -> Dict[str, Any]:
        """Authenticate with Garmin Connect via Terra API"""
        try:
            # Terra API authentication for Garmin
            auth_url = f"{self.base_url}/auth/authenticateUser"
            
            payload = {
                "reference_id": user_id,
                "providers": ["GARMIN"],
                "auth_success_redirect_url": auth_data.get("success_url", ""),
                "auth_failure_redirect_url": auth_data.get("failure_url", "")
            }
            
            response = requests.post(
                auth_url,
                headers=self.get_auth_headers(),
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Cache the authentication data
                cache_key = f"wearable_auth:{user_id}:garmin"
                cache.set(cache_key, result, ttl=86400)  # 24 hours
                
                return {
                    "success": True,
                    "auth_url": result.get("auth_url"),
                    "user_id": result.get("user_id"),
                    "provider": "garmin"
                }
            else:
                return {"success": False, "error": "Garmin authentication failed"}
                
        except Exception as e:
            logger.error(f"Garmin authentication error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _authenticate_apple_health(self, user_id: str, auth_data: Dict) -> Dict[str, Any]:
        """Authenticate with Apple Health via Terra API"""
        try:
            # For Apple Health, we typically need the mobile app to handle auth
            # Terra provides iOS/Android SDKs for this
            
            auth_url = f"{self.base_url}/auth/authenticateUser"
            
            payload = {
                "reference_id": user_id,
                "providers": ["APPLE"],
                "auth_success_redirect_url": auth_data.get("success_url", ""),
                "auth_failure_redirect_url": auth_data.get("failure_url", "")
            }
            
            response = requests.post(
                auth_url,
                headers=self.get_auth_headers(),
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                
                # Cache the authentication data
                cache_key = f"wearable_auth:{user_id}:apple"
                cache.set(cache_key, result, ttl=86400)
                
                return {
                    "success": True,
                    "auth_url": result.get("auth_url"),
                    "user_id": result.get("user_id"),
                    "provider": "apple",
                    "note": "Complete authentication in mobile app"
                }
            else:
                return {"success": False, "error": "Apple Health authentication failed"}
                
        except Exception as e:
            logger.error(f"Apple Health authentication error: {e}")
            return {"success": False, "error": str(e)}
    
    async def _authenticate_fitbit(self, user_id: str, auth_data: Dict) -> Dict[str, Any]:
        """Authenticate with Fitbit via Terra API"""
        try:
            auth_url = f"{self.base_url}/auth/authenticateUser"
            
            payload = {
                "reference_id": user_id,
                "providers": ["FITBIT"],
                "auth_success_redirect_url": auth_data.get("success_url", ""),
                "auth_failure_redirect_url": auth_data.get("failure_url", "")
            }
            
            response = requests.post(
                auth_url,
                headers=self.get_auth_headers(),
                json=payload
            )
            
            if response.status_code == 200:
                result = response.json()
                
                cache_key = f"wearable_auth:{user_id}:fitbit"
                cache.set(cache_key, result, ttl=86400)
                
                return {
                    "success": True,
                    "auth_url": result.get("auth_url"),
                    "user_id": result.get("user_id"),
                    "provider": "fitbit"
                }
            else:
                return {"success": False, "error": "Fitbit authentication failed"}
                
        except Exception as e:
            logger.error(f"Fitbit authentication error: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_daily_data(self, user_id: str, date: str = None) -> Dict[str, Any]:
        """
        Get comprehensive daily data from all connected devices
        
        Args:
            user_id: Aria user ID
            date: Date in YYYY-MM-DD format (defaults to today)
            
        Returns:
            Aggregated daily data from all sources
        """
        if not date:
            date = datetime.now().strftime("%Y-%m-%d")
        
        # Check cache first
        cache_key = f"wearable_daily:{user_id}:{date}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            # Get data from Terra API
            daily_url = f"{self.base_url}/daily"
            
            params = {
                "user_id": user_id,
                "start_date": date,
                "end_date": date
            }
            
            response = requests.get(
                daily_url,
                headers=self.get_auth_headers(),
                params=params
            )
            
            if response.status_code == 200:
                raw_data = response.json()
                
                # Process and structure the data
                processed_data = self._process_daily_data(raw_data)
                
                # Cache for 1 hour (data updates frequently)
                cache.set(cache_key, processed_data, ttl=3600)
                
                return processed_data
            else:
                logger.error(f"Failed to fetch daily data: {response.status_code}")
                return {"success": False, "error": "Failed to fetch daily data"}
                
        except Exception as e:
            logger.error(f"Error fetching daily data: {e}")
            return {"success": False, "error": str(e)}
    
    def _process_daily_data(self, raw_data: Dict) -> Dict[str, Any]:
        """Process raw wearable data into structured format for Aria"""
        try:
            data = raw_data.get("data", [])
            if not data:
                return {"success": True, "data": {}, "message": "No data available"}
            
            # Take the most recent entry
            latest_data = data[0]
            
            # Extract key metrics for sprint training
            processed = {
                "success": True,
                "date": latest_data.get("calendar_date"),
                "provider": latest_data.get("provider"),
                
                # Sleep data
                "sleep": {
                    "duration_hours": self._safe_get_hours(latest_data, "sleep_durations_data.asleep_duration_seconds"),
                    "efficiency_percent": self._safe_get(latest_data, "sleep_durations_data.efficiency_percentage"),
                    "deep_sleep_hours": self._safe_get_hours(latest_data, "sleep_durations_data.deep_sleep_duration_seconds"),
                    "rem_sleep_hours": self._safe_get_hours(latest_data, "sleep_durations_data.rem_sleep_duration_seconds"),
                    "sleep_score": self._safe_get(latest_data, "sleep_durations_data.score"),
                    "bedtime": self._safe_get(latest_data, "sleep_durations_data.bedtime_start"),
                    "wake_time": self._safe_get(latest_data, "sleep_durations_data.bedtime_end")
                },
                
                # Activity data
                "activity": {
                    "steps": self._safe_get(latest_data, "distance_data.steps"),
                    "distance_km": self._safe_get_km(latest_data, "distance_data.distance_meters"),
                    "calories_burned": self._safe_get(latest_data, "calories_data.total_burned_calories"),
                    "active_minutes": self._safe_get_minutes(latest_data, "calories_data.active_duration_seconds"),
                    "floors_climbed": self._safe_get(latest_data, "distance_data.floors")
                },
                
                # Heart rate data
                "heart_rate": {
                    "resting_hr": self._safe_get(latest_data, "heart_rate_data.summary.resting_hr_bpm"),
                    "max_hr": self._safe_get(latest_data, "heart_rate_data.summary.max_hr_bpm"),
                    "avg_hr": self._safe_get(latest_data, "heart_rate_data.summary.avg_hr_bpm"),
                    "hrv_rmssd": self._safe_get(latest_data, "heart_rate_data.summary.hrv_rmssd")
                },
                
                # Recovery metrics
                "recovery": {
                    "stress_score": self._safe_get(latest_data, "stress_data.stress_duration_seconds"),
                    "recovery_score": self._safe_get(latest_data, "readiness_data.score"),
                    "body_battery": self._safe_get(latest_data, "body_data.body_battery_percentage")
                },
                
                # Body composition
                "body": {
                    "weight_kg": self._safe_get(latest_data, "body_data.weight_kg"),
                    "body_fat_percent": self._safe_get(latest_data, "body_data.body_fat_percentage"),
                    "muscle_mass_kg": self._safe_get(latest_data, "body_data.muscle_mass_kg"),
                    "hydration_percent": self._safe_get(latest_data, "body_data.hydration_percentage")
                }
            }
            
            # Add training load and readiness indicators
            processed["training_insights"] = self._calculate_training_insights(processed)
            
            return processed
            
        except Exception as e:
            logger.error(f"Error processing daily data: {e}")
            return {"success": False, "error": str(e)}
    
    def _safe_get(self, data: Dict, path: str) -> Optional[Any]:
        """Safely get nested dictionary values"""
        try:
            keys = path.split(".")
            value = data
            for key in keys:
                value = value.get(key)
                if value is None:
                    return None
            return value
        except:
            return None
    
    def _safe_get_hours(self, data: Dict, path: str) -> Optional[float]:
        """Convert seconds to hours"""
        seconds = self._safe_get(data, path)
        return round(seconds / 3600, 2) if seconds else None
    
    def _safe_get_minutes(self, data: Dict, path: str) -> Optional[float]:
        """Convert seconds to minutes"""
        seconds = self._safe_get(data, path)
        return round(seconds / 60, 2) if seconds else None
    
    def _safe_get_km(self, data: Dict, path: str) -> Optional[float]:
        """Convert meters to kilometers"""
        meters = self._safe_get(data, path)
        return round(meters / 1000, 2) if meters else None
    
    def _calculate_training_insights(self, data: Dict) -> Dict[str, Any]:
        """Calculate training readiness and recommendations based on wearable data"""
        insights = {
            "readiness_score": 0,
            "training_recommendation": "moderate",
            "focus_areas": [],
            "warnings": []
        }
        
        try:
            sleep_data = data.get("sleep", {})
            hr_data = data.get("heart_rate", {})
            recovery_data = data.get("recovery", {})
            
            # Calculate readiness score (0-100)
            score_factors = []
            
            # Sleep quality (40% of score)
            sleep_hours = sleep_data.get("duration_hours")
            if sleep_hours:
                if sleep_hours >= 7.5:
                    score_factors.append(40)
                elif sleep_hours >= 6.5:
                    score_factors.append(30)
                else:
                    score_factors.append(15)
                    insights["warnings"].append("Insufficient sleep duration")
            
            # HRV and resting HR (30% of score)
            resting_hr = hr_data.get("resting_hr")
            if resting_hr:
                # Lower resting HR generally indicates better recovery
                if resting_hr <= 60:
                    score_factors.append(30)
                elif resting_hr <= 70:
                    score_factors.append(20)
                else:
                    score_factors.append(10)
                    insights["warnings"].append("Elevated resting heart rate")
            
            # Recovery metrics (30% of score)
            recovery_score = recovery_data.get("recovery_score")
            if recovery_score:
                score_factors.append(recovery_score * 0.3)
            
            # Calculate final readiness score
            insights["readiness_score"] = min(100, sum(score_factors))
            
            # Training recommendations based on readiness
            if insights["readiness_score"] >= 80:
                insights["training_recommendation"] = "high_intensity"
                insights["focus_areas"].append("Speed work and high intensity training")
            elif insights["readiness_score"] >= 60:
                insights["training_recommendation"] = "moderate"
                insights["focus_areas"].append("Moderate intensity training")
            else:
                insights["training_recommendation"] = "recovery"
                insights["focus_areas"].append("Active recovery and light training")
                insights["warnings"].append("Consider rest or light recovery today")
            
            # Specific recommendations based on data
            if sleep_data.get("efficiency_percent") and sleep_data["efficiency_percent"] < 85:
                insights["focus_areas"].append("Sleep quality improvement")
            
            if hr_data.get("hrv_rmssd") and hr_data["hrv_rmssd"] < 30:
                insights["focus_areas"].append("Stress management and recovery")
            
        except Exception as e:
            logger.error(f"Error calculating training insights: {e}")
            insights["error"] = str(e)
        
        return insights
    
    async def get_workout_data(self, user_id: str, start_date: str, end_date: str = None) -> Dict[str, Any]:
        """
        Get workout/activity data from wearable devices
        
        Args:
            user_id: Aria user ID
            start_date: Start date in YYYY-MM-DD format
            end_date: End date in YYYY-MM-DD format (defaults to start_date)
            
        Returns:
            Workout data from connected devices
        """
        if not end_date:
            end_date = start_date
        
        cache_key = f"wearable_workouts:{user_id}:{start_date}:{end_date}"
        cached_data = cache.get(cache_key)
        if cached_data:
            return cached_data
        
        try:
            # Get activity data from Terra API
            activity_url = f"{self.base_url}/activity"
            
            params = {
                "user_id": user_id,
                "start_date": start_date,
                "end_date": end_date
            }
            
            response = requests.get(
                activity_url,
                headers=self.get_auth_headers(),
                params=params
            )
            
            if response.status_code == 200:
                raw_data = response.json()
                processed_data = self._process_workout_data(raw_data)
                
                # Cache for 2 hours
                cache.set(cache_key, processed_data, ttl=7200)
                
                return processed_data
            else:
                return {"success": False, "error": "Failed to fetch workout data"}
                
        except Exception as e:
            logger.error(f"Error fetching workout data: {e}")
            return {"success": False, "error": str(e)}
    
    def _process_workout_data(self, raw_data: Dict) -> Dict[str, Any]:
        """Process raw workout data for sprint training analysis"""
        try:
            activities = raw_data.get("data", [])
            
            processed_workouts = []
            
            for activity in activities:
                workout = {
                    "id": activity.get("metadata", {}).get("id"),
                    "name": activity.get("metadata", {}).get("name"),
                    "start_time": activity.get("metadata", {}).get("start_time"),
                    "end_time": activity.get("metadata", {}).get("end_time"),
                    "duration_minutes": self._safe_get_minutes(activity, "metadata.duration_seconds"),
                    "sport_type": activity.get("metadata", {}).get("type"),
                    
                    # Performance metrics
                    "distance_km": self._safe_get_km(activity, "distance_data.summary.distance_meters"),
                    "avg_pace_per_km": self._calculate_pace(activity),
                    "max_speed_kmh": self._safe_get_kmh(activity, "distance_data.summary.max_speed_meters_per_second"),
                    "avg_speed_kmh": self._safe_get_kmh(activity, "distance_data.summary.avg_speed_meters_per_second"),
                    
                    # Heart rate data
                    "avg_heart_rate": self._safe_get(activity, "heart_rate_data.summary.avg_hr_bpm"),
                    "max_heart_rate": self._safe_get(activity, "heart_rate_data.summary.max_hr_bpm"),
                    "heart_rate_zones": self._process_hr_zones(activity),
                    
                    # Training load
                    "calories_burned": self._safe_get(activity, "calories_data.total_burned_calories"),
                    "training_stress_score": self._safe_get(activity, "metadata.training_stress_score"),
                    
                    # Sprint-specific metrics
                    "is_sprint_workout": self._identify_sprint_workout(activity),
                    "sprint_analysis": self._analyze_sprint_performance(activity)
                }
                
                processed_workouts.append(workout)
            
            return {
                "success": True,
                "workouts": processed_workouts,
                "total_workouts": len(processed_workouts),
                "sprint_workouts": len([w for w in processed_workouts if w["is_sprint_workout"]])
            }
            
        except Exception as e:
            logger.error(f"Error processing workout data: {e}")
            return {"success": False, "error": str(e)}
    
    def _safe_get_kmh(self, data: Dict, path: str) -> Optional[float]:
        """Convert meters per second to km/h"""
        mps = self._safe_get(data, path)
        return round(mps * 3.6, 2) if mps else None
    
    def _calculate_pace(self, activity: Dict) -> Optional[str]:
        """Calculate pace in min/km format"""
        try:
            distance_m = self._safe_get(activity, "distance_data.summary.distance_meters")
            duration_s = self._safe_get(activity, "metadata.duration_seconds")
            
            if distance_m and duration_s and distance_m > 0:
                pace_per_km = (duration_s / (distance_m / 1000)) / 60  # minutes per km
                minutes = int(pace_per_km)
                seconds = int((pace_per_km - minutes) * 60)
                return f"{minutes}:{seconds:02d}"
            return None
        except:
            return None
    
    def _process_hr_zones(self, activity: Dict) -> Dict[str, Any]:
        """Process heart rate zone data"""
        try:
            hr_zones = self._safe_get(activity, "heart_rate_data.summary.hr_zones")
            if hr_zones:
                return {
                    "zone_1_time": hr_zones.get("zone_1_duration_seconds", 0) / 60,
                    "zone_2_time": hr_zones.get("zone_2_duration_seconds", 0) / 60,
                    "zone_3_time": hr_zones.get("zone_3_duration_seconds", 0) / 60,
                    "zone_4_time": hr_zones.get("zone_4_duration_seconds", 0) / 60,
                    "zone_5_time": hr_zones.get("zone_5_duration_seconds", 0) / 60
                }
            return {}
        except:
            return {}
    
    def _identify_sprint_workout(self, activity: Dict) -> bool:
        """Identify if workout is sprint-related"""
        try:
            name = activity.get("metadata", {}).get("name", "").lower()
            sport_type = activity.get("metadata", {}).get("type", "").lower()
            
            sprint_keywords = ["sprint", "interval", "speed", "track", "100m", "200m", "400m"]
            
            # Check name and sport type
            if any(keyword in name for keyword in sprint_keywords):
                return True
            
            if sport_type in ["running", "track_running", "interval_training"]:
                # Check if workout characteristics suggest sprinting
                max_speed = self._safe_get_kmh(activity, "distance_data.summary.max_speed_meters_per_second")
                duration = self._safe_get(activity, "metadata.duration_seconds")
                
                # High speed + short duration suggests sprint work
                if max_speed and max_speed > 20 and duration and duration < 1800:  # 30 min
                    return True
            
            return False
        except:
            return False
    
    def _analyze_sprint_performance(self, activity: Dict) -> Dict[str, Any]:
        """Analyze sprint-specific performance metrics"""
        try:
            if not self._identify_sprint_workout(activity):
                return {}
            
            analysis = {
                "peak_speed_kmh": self._safe_get_kmh(activity, "distance_data.summary.max_speed_meters_per_second"),
                "avg_speed_kmh": self._safe_get_kmh(activity, "distance_data.summary.avg_speed_meters_per_second"),
                "speed_consistency": 0,
                "recovery_quality": "unknown"
            }
            
            # Calculate speed consistency
            max_speed = analysis.get("peak_speed_kmh")
            avg_speed = analysis.get("avg_speed_kmh")
            
            if max_speed and avg_speed and max_speed > 0:
                analysis["speed_consistency"] = round((avg_speed / max_speed) * 100, 1)
            
            # Analyze heart rate recovery (simplified)
            hr_data = activity.get("heart_rate_data", {})
            if hr_data:
                max_hr = self._safe_get(activity, "heart_rate_data.summary.max_hr_bpm")
                avg_hr = self._safe_get(activity, "heart_rate_data.summary.avg_hr_bpm")
                
                if max_hr and avg_hr:
                    hr_ratio = avg_hr / max_hr
                    if hr_ratio < 0.85:
                        analysis["recovery_quality"] = "good"
                    elif hr_ratio < 0.95:
                        analysis["recovery_quality"] = "moderate"
                    else:
                        analysis["recovery_quality"] = "needs_improvement"
            
            return analysis
            
        except Exception as e:
            logger.error(f"Error analyzing sprint performance: {e}")
            return {}

# Initialize global wearable integrator
wearable_integrator = WearableDataIntegrator()