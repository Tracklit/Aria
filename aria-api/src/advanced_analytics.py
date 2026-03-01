"""
Advanced Analytics for Aria
Performance predictions, trends, benchmarks, and insights
"""
from typing import Dict, Any, List, Optional, Tuple
import logging
from datetime import datetime, timedelta, date
from src.database_extensions import get_training_sessions, get_progress_metrics
from src.database import get_athlete_profile
import numpy as np
from scipy import stats

logger = logging.getLogger(__name__)


class AnalyticsService:
    """Advanced analytics and predictive modeling"""
    
    def __init__(self):
        logger.info("Analytics service initialized")
    
    async def get_performance_trends(
        self,
        user_id: str,
        metric_type: str = "100m_time",
        days: int = 90
    ) -> Dict[str, Any]:
        """Analyze performance trends over time"""
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=days)
            
            # Get progress metrics
            metrics = get_progress_metrics(
                user_id,
                metric_type=metric_type,
                start_date=str(start_date),
                end_date=str(end_date)
            )
            
            if len(metrics) < 2:
                return {
                    "success": False,
                    "error": "Insufficient data for trend analysis",
                    "data_points": len(metrics)
                }
            
            # Extract dates and values
            dates = [datetime.fromisoformat(str(m["metric_date"])) for m in metrics]
            values = [m["metric_value"] for m in metrics]
            
            # Convert dates to days since start
            days_since_start = [(d - dates[0]).days for d in dates]
            
            # Linear regression for trend
            slope, intercept, r_value, p_value, std_err = stats.linregress(days_since_start, values)
            
            # Determine if lower is better
            lower_is_better = "time" in metric_type.lower()
            
            # Calculate trend direction
            if abs(slope) < 0.01:
                trend_direction = "stable"
            elif (slope < 0 and lower_is_better) or (slope > 0 and not lower_is_better):
                trend_direction = "improving"
            else:
                trend_direction = "declining"
            
            # Calculate improvement rate
            total_change = values[-1] - values[0]
            percent_change = (total_change / values[0]) * 100 if values[0] != 0 else 0
            
            # Predict next value (30 days from last measurement)
            days_to_predict = 30
            next_days = days_since_start[-1] + days_to_predict
            predicted_value = slope * next_days + intercept
            
            return {
                "success": True,
                "metric_type": metric_type,
                "data_points": len(metrics),
                "date_range": {
                    "start": str(start_date),
                    "end": str(end_date)
                },
                "current_value": values[-1],
                "best_value": min(values) if lower_is_better else max(values),
                "trend": {
                    "direction": trend_direction,
                    "slope": slope,
                    "r_squared": r_value ** 2,
                    "percent_change": percent_change
                },
                "prediction": {
                    "days_ahead": days_to_predict,
                    "predicted_value": predicted_value,
                    "confidence": "high" if r_value ** 2 > 0.7 else "medium" if r_value ** 2 > 0.4 else "low"
                },
                "data": [
                    {
                        "date": d.isoformat(),
                        "value": v
                    }
                    for d, v in zip(dates, values)
                ]
            }
            
        except Exception as e:
            logger.error(f"Error analyzing trends for {user_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def predict_personal_record(
        self,
        user_id: str,
        event: str = "100m",
        training_days: int = 90
    ) -> Dict[str, Any]:
        """Predict when user might achieve a PR"""
        try:
            # Get performance trends
            trends = await self.get_performance_trends(user_id, f"{event}_time", days=90)
            
            if not trends.get("success"):
                return trends
            
            # Check if improving
            if trends["trend"]["direction"] != "improving":
                return {
                    "success": True,
                    "prediction": "Continue current training to establish improvement trend",
                    "confidence": "low",
                    "recommendation": "Focus on consistency and progressive overload"
                }
            
            current_value = trends["current_value"]
            best_value = trends["best_value"]
            slope = trends["trend"]["slope"]
            
            # Calculate days to PR (1% improvement)
            target_improvement = best_value * 0.01
            target_value = best_value - target_improvement
            
            if slope >= 0:
                days_to_pr = "N/A"
                confidence = "low"
            else:
                days_to_pr = int((target_value - current_value) / slope)
                if days_to_pr < 0:
                    days_to_pr = "Already achieved"
                confidence = "high" if trends["trend"]["r_squared"] > 0.7 else "medium"
            
            return {
                "success": True,
                "event": event,
                "current_best": best_value,
                "predicted_pr": target_value,
                "improvement_needed": target_improvement,
                "estimated_days": days_to_pr,
                "confidence": confidence,
                "recommendation": self._get_pr_recommendation(days_to_pr, confidence)
            }
            
        except Exception as e:
            logger.error(f"Error predicting PR for {user_id}: {e}")
            return {"success": False, "error": str(e)}
    
    def _get_pr_recommendation(self, days_to_pr: Any, confidence: str) -> str:
        """Generate recommendation based on PR prediction"""
        if days_to_pr == "Already achieved":
            return "You're already at a new PR! Time to set a new goal."
        elif days_to_pr == "N/A":
            return "Focus on establishing consistent improvement first."
        elif isinstance(days_to_pr, int):
            if days_to_pr < 30:
                return f"You're close to a PR! Maintain intensity and focus on race-specific prep."
            elif days_to_pr < 90:
                return f"Keep up current training. You're {days_to_pr} days away from a predicted PR."
            else:
                return f"Long-term projection. Stay consistent and reassess in 30 days."
        return "Continue training and track progress regularly."
    
    async def calculate_training_load(
        self,
        user_id: str,
        days: int = 28
    ) -> Dict[str, Any]:
        """Calculate acute:chronic workload ratio for injury prevention"""
        try:
            end_date = date.today()
            start_date = end_date - timedelta(days=days)
            
            sessions = get_training_sessions(
                user_id,
                start_date=str(start_date),
                end_date=str(end_date),
                limit=100
            )
            
            if len(sessions) < 7:
                return {
                    "success": False,
                    "error": "Need at least 7 days of data"
                }
            
            # Calculate training load for each session (RPE * duration)
            session_loads = []
            for session in sessions:
                rpe = session.get("rpe", 5)
                duration = session.get("duration_minutes", 60)
                load = rpe * duration
                session_loads.append({
                    "date": session["session_date"],
                    "load": load
                })
            
            # Calculate acute load (last 7 days)
            acute_sessions = [s for s in session_loads if 
                             (datetime.now().date() - datetime.fromisoformat(str(s["date"])).date()).days <= 7]
            acute_load = sum(s["load"] for s in acute_sessions) if acute_sessions else 0
            
            # Calculate chronic load (last 28 days average)
            chronic_load = sum(s["load"] for s in session_loads) / 4 if session_loads else 0
            
            # Calculate ACWR
            acwr = acute_load / chronic_load if chronic_load > 0 else 0
            
            # Determine risk level
            if acwr < 0.8:
                risk_level = "low"
                status = "undertraining"
                recommendation = "You can safely increase training volume."
            elif 0.8 <= acwr <= 1.3:
                risk_level = "optimal"
                status = "optimal"
                recommendation = "Training load is well-balanced. Maintain current approach."
            elif 1.3 < acwr <= 1.5:
                risk_level = "moderate"
                status = "caution"
                recommendation = "Training load is elevated. Monitor for fatigue and consider a recovery day."
            else:
                risk_level = "high"
                status = "overtraining_risk"
                recommendation = "Training load is too high. Take 1-2 recovery days immediately."
            
            return {
                "success": True,
                "acwr": round(acwr, 2),
                "acute_load": round(acute_load, 1),
                "chronic_load": round(chronic_load, 1),
                "risk_level": risk_level,
                "status": status,
                "recommendation": recommendation,
                "sessions_analyzed": len(sessions)
            }
            
        except Exception as e:
            logger.error(f"Error calculating training load for {user_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def get_percentile_ranking(
        self,
        user_id: str,
        metric_type: str = "100m_time",
        comparison_group: str = "all"
    ) -> Dict[str, Any]:
        """Get user's percentile ranking compared to similar athletes"""
        try:
            from src.database import db_pool
            
            athlete = get_athlete_profile(user_id)
            if not athlete:
                return {"success": False, "error": "Athlete not found"}
            
            # Get user's best metric
            user_metrics = get_progress_metrics(user_id, metric_type=metric_type, limit=1)
            if not user_metrics:
                return {"success": False, "error": "No metrics found for user"}
            
            user_value = user_metrics[0]["metric_value"]
            
            # Build comparison query based on group
            with db_pool.get_cursor() as cursor:
                if comparison_group == "age_group":
                    age = athlete.get("age", 25)
                    age_min = (age // 5) * 5
                    age_max = age_min + 4
                    
                    cursor.execute("""
                        SELECT pm.metric_value
                        FROM progress_metrics pm
                        JOIN athlete_profiles ap ON pm.user_id = ap.user_id
                        WHERE pm.metric_type = %s
                          AND ap.age BETWEEN %s AND %s
                        ORDER BY pm.metric_value ASC
                    """, (metric_type, age_min, age_max))
                    
                    comparison_label = f"Age {age_min}-{age_max}"
                    
                elif comparison_group == "gender":
                    gender = athlete.get("gender", "male")
                    
                    cursor.execute("""
                        SELECT pm.metric_value
                        FROM progress_metrics pm
                        JOIN athlete_profiles ap ON pm.user_id = ap.user_id
                        WHERE pm.metric_type = %s
                          AND ap.gender = %s
                        ORDER BY pm.metric_value ASC
                    """, (metric_type, gender))
                    
                    comparison_label = f"{gender.capitalize()} Athletes"
                    
                else:  # all
                    cursor.execute("""
                        SELECT metric_value
                        FROM progress_metrics
                        WHERE metric_type = %s
                        ORDER BY metric_value ASC
                    """, (metric_type,))
                    
                    comparison_label = "All Athletes"
                
                all_values = [row[0] for row in cursor.fetchall()]
            
            if not all_values:
                return {"success": False, "error": "No comparison data available"}
            
            # Calculate percentile
            percentile = stats.percentileofscore(all_values, user_value, kind='rank')
            
            # For time-based metrics, invert percentile (lower time = higher percentile)
            if "time" in metric_type.lower():
                percentile = 100 - percentile
            
            # Determine performance level
            if percentile >= 95:
                level = "Elite"
            elif percentile >= 85:
                level = "Advanced"
            elif percentile >= 70:
                level = "Intermediate+"
            elif percentile >= 50:
                level = "Intermediate"
            elif percentile >= 30:
                level = "Developing"
            else:
                level = "Beginner"
            
            return {
                "success": True,
                "user_value": user_value,
                "percentile": round(percentile, 1),
                "performance_level": level,
                "comparison_group": comparison_label,
                "total_athletes": len(all_values),
                "better_than": f"{round(percentile, 0)}% of {comparison_label.lower()}"
            }
            
        except Exception as e:
            logger.error(f"Error calculating percentile for {user_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def generate_insights_dashboard(
        self,
        user_id: str
    ) -> Dict[str, Any]:
        """Generate comprehensive insights dashboard"""
        try:
            insights = {
                "user_id": user_id,
                "generated_at": datetime.now().isoformat(),
                "insights": []
            }
            
            # Training load analysis
            load_analysis = await self.calculate_training_load(user_id)
            if load_analysis.get("success"):
                insights["training_load"] = load_analysis
                
                if load_analysis["risk_level"] == "high":
                    insights["insights"].append({
                        "type": "warning",
                        "priority": "high",
                        "message": "⚠️ Training load is too high. Risk of overtraining.",
                        "action": load_analysis["recommendation"]
                    })
                elif load_analysis["risk_level"] == "optimal":
                    insights["insights"].append({
                        "type": "positive",
                        "priority": "low",
                        "message": "✓ Training load is optimal.",
                        "action": "Keep up the great work!"
                    })
            
            # Performance trends
            trend_analysis = await self.get_performance_trends(user_id, "100m_time", days=90)
            if trend_analysis.get("success"):
                insights["performance_trend"] = trend_analysis
                
                if trend_analysis["trend"]["direction"] == "improving":
                    insights["insights"].append({
                        "type": "positive",
                        "priority": "medium",
                        "message": f"📈 Your 100m time is improving by {abs(trend_analysis['trend']['percent_change']):.1f}%",
                        "action": "Maintain current training approach"
                    })
            
            # PR prediction
            pr_prediction = await self.predict_personal_record(user_id, "100m")
            if pr_prediction.get("success"):
                insights["pr_prediction"] = pr_prediction
                
                if isinstance(pr_prediction.get("estimated_days"), int) and pr_prediction["estimated_days"] < 60:
                    insights["insights"].append({
                        "type": "motivational",
                        "priority": "high",
                        "message": f"🎯 PR Prediction: {pr_prediction['estimated_days']} days away!",
                        "action": pr_prediction["recommendation"]
                    })
            
            # Percentile ranking
            ranking = await self.get_percentile_ranking(user_id, "100m_time", "age_group")
            if ranking.get("success"):
                insights["ranking"] = ranking
                
                insights["insights"].append({
                    "type": "informational",
                    "priority": "low",
                    "message": f"📊 You're in the {ranking['performance_level']} category",
                    "action": f"Better than {ranking['better_than']}"
                })
            
            return insights
            
        except Exception as e:
            logger.error(f"Error generating insights dashboard for {user_id}: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
analytics_service = AnalyticsService()
