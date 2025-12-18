"""
Equipment Tracking System
Track running shoes, spikes, and gear with mileage alerts and replacement recommendations
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, date, timedelta
from src.database import get_db_connection
import psycopg2.extras

logger = logging.getLogger(__name__)

# Equipment lifespan constants (in miles)
EQUIPMENT_LIFESPANS = {
    "training_shoes": 400,
    "racing_spikes": 300,
    "racing_flats": 350,
    "compression_gear": float('inf'),  # No mileage tracking
    "other": float('inf')
}

REPLACEMENT_WARNING_THRESHOLD = 0.85  # Warn at 85% of lifespan

# =============================================================================
# DATABASE FUNCTIONS
# =============================================================================

def create_equipment_tables():
    """Create equipment tracking tables"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    try:
        # Equipment inventory
        cur.execute("""
            CREATE TABLE IF NOT EXISTS equipment (
                equipment_id SERIAL PRIMARY KEY,
                user_id VARCHAR(255) NOT NULL,
                equipment_type VARCHAR(100) NOT NULL,
                brand VARCHAR(100),
                model VARCHAR(100),
                purchase_date DATE,
                initial_mileage FLOAT DEFAULT 0.0,
                current_mileage FLOAT DEFAULT 0.0,
                max_mileage FLOAT,
                status VARCHAR(50) DEFAULT 'active',
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment usage logs
        cur.execute("""
            CREATE TABLE IF NOT EXISTS equipment_usage (
                usage_id SERIAL PRIMARY KEY,
                equipment_id INTEGER REFERENCES equipment(equipment_id),
                user_id VARCHAR(255) NOT NULL,
                miles_added FLOAT NOT NULL,
                usage_date DATE NOT NULL,
                session_type VARCHAR(100),
                notes TEXT,
                logged_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        # Equipment maintenance
        cur.execute("""
            CREATE TABLE IF NOT EXISTS equipment_maintenance (
                maintenance_id SERIAL PRIMARY KEY,
                equipment_id INTEGER REFERENCES equipment(equipment_id),
                maintenance_type VARCHAR(100) NOT NULL,
                maintenance_date DATE NOT NULL,
                cost DECIMAL(10, 2),
                notes TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        
        conn.commit()
        logger.info("Equipment tracking tables created successfully")
        
    except Exception as e:
        logger.error(f"Error creating equipment tables: {e}")
        conn.rollback()
        raise
    finally:
        cur.close()
        conn.close()

# =============================================================================
# EQUIPMENT MANAGEMENT
# =============================================================================

def add_equipment(
    user_id: str,
    equipment_type: str,
    brand: str,
    model: str,
    purchase_date: date,
    initial_mileage: float = 0.0
) -> Dict[str, Any]:
    """Add new equipment to inventory"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Get max mileage for equipment type
        max_mileage = EQUIPMENT_LIFESPANS.get(equipment_type, 400)
        
        cur.execute("""
            INSERT INTO equipment 
            (user_id, equipment_type, brand, model, purchase_date, initial_mileage, current_mileage, max_mileage)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            RETURNING equipment_id, equipment_type, brand, model, current_mileage, max_mileage
        """, (user_id, equipment_type, brand, model, purchase_date, initial_mileage, initial_mileage, max_mileage))
        
        equipment = cur.fetchone()
        conn.commit()
        
        logger.info(f"Equipment added for user {user_id}: {brand} {model}")
        return {
            "success": True,
            "equipment": dict(equipment),
            "message": f"{brand} {model} added to your gear inventory"
        }
        
    except Exception as e:
        logger.error(f"Error adding equipment: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def log_equipment_usage(
    equipment_id: int,
    user_id: str,
    miles_added: float,
    usage_date: date,
    session_type: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Log miles on equipment"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Log usage
        cur.execute("""
            INSERT INTO equipment_usage (equipment_id, user_id, miles_added, usage_date, session_type, notes)
            VALUES (%s, %s, %s, %s, %s, %s)
            RETURNING usage_id
        """, (equipment_id, user_id, miles_added, usage_date, session_type, notes))
        
        usage = cur.fetchone()
        
        # Update equipment mileage
        cur.execute("""
            UPDATE equipment
            SET current_mileage = current_mileage + %s
            WHERE equipment_id = %s
            RETURNING current_mileage, max_mileage, brand, model
        """, (miles_added, equipment_id))
        
        equipment = cur.fetchone()
        conn.commit()
        
        # Check if replacement warning needed
        warning = None
        if equipment["max_mileage"] and equipment["current_mileage"] >= (equipment["max_mileage"] * REPLACEMENT_WARNING_THRESHOLD):
            warning = f"⚠️ Your {equipment['brand']} {equipment['model']} is approaching its recommended mileage limit"
        
        return {
            "success": True,
            "usage_id": usage["usage_id"],
            "current_mileage": equipment["current_mileage"],
            "max_mileage": equipment["max_mileage"],
            "warning": warning
        }
        
    except Exception as e:
        logger.error(f"Error logging equipment usage: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def get_user_equipment(user_id: str, status: Optional[str] = None) -> List[Dict[str, Any]]:
    """Get all equipment for user"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        if status:
            cur.execute("""
                SELECT * FROM equipment
                WHERE user_id = %s AND status = %s
                ORDER BY purchase_date DESC
            """, (user_id, status))
        else:
            cur.execute("""
                SELECT * FROM equipment
                WHERE user_id = %s
                ORDER BY purchase_date DESC
            """, (user_id,))
        
        equipment = cur.fetchall()
        
        # Add health status to each item
        result = []
        for item in equipment:
            item_dict = dict(item)
            item_dict["health_status"] = get_equipment_health(item_dict)
            result.append(item_dict)
        
        return result
        
    except Exception as e:
        logger.error(f"Error fetching equipment: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def get_equipment_health(equipment: Dict[str, Any]) -> Dict[str, Any]:
    """Calculate equipment health status"""
    current = equipment.get("current_mileage", 0)
    maximum = equipment.get("max_mileage")
    
    if not maximum or maximum == float('inf'):
        return {
            "status": "good",
            "percentage": 100,
            "message": "No mileage tracking for this equipment"
        }
    
    percentage = (current / maximum) * 100
    
    if percentage < 70:
        status = "excellent"
        message = "Great condition"
    elif percentage < 85:
        status = "good"
        message = "Still good to go"
    elif percentage < 95:
        status = "warning"
        message = "Consider replacing soon"
    else:
        status = "critical"
        message = "Replacement recommended"
    
    return {
        "status": status,
        "percentage": round(percentage, 1),
        "miles_remaining": maximum - current,
        "message": message
    }


def get_equipment_alerts(user_id: str) -> List[Dict[str, Any]]:
    """Get equipment replacement alerts"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM equipment
            WHERE user_id = %s 
            AND status = 'active'
            AND max_mileage IS NOT NULL
            AND current_mileage >= (max_mileage * %s)
            ORDER BY (current_mileage / max_mileage) DESC
        """, (user_id, REPLACEMENT_WARNING_THRESHOLD))
        
        equipment = cur.fetchall()
        
        alerts = []
        for item in equipment:
            health = get_equipment_health(dict(item))
            alerts.append({
                "equipment_id": item["equipment_id"],
                "type": item["equipment_type"],
                "brand": item["brand"],
                "model": item["model"],
                "current_mileage": item["current_mileage"],
                "max_mileage": item["max_mileage"],
                "health": health,
                "alert_level": health["status"]
            })
        
        return alerts
        
    except Exception as e:
        logger.error(f"Error fetching equipment alerts: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def retire_equipment(equipment_id: int, user_id: str, notes: Optional[str] = None) -> Dict[str, Any]:
    """Retire equipment"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            UPDATE equipment
            SET status = 'retired', notes = %s
            WHERE equipment_id = %s AND user_id = %s
            RETURNING equipment_id, brand, model, current_mileage
        """, (notes, equipment_id, user_id))
        
        equipment = cur.fetchone()
        conn.commit()
        
        if equipment:
            return {
                "success": True,
                "equipment": dict(equipment),
                "message": f"{equipment['brand']} {equipment['model']} retired at {equipment['current_mileage']} miles"
            }
        else:
            return {"success": False, "error": "Equipment not found"}
        
    except Exception as e:
        logger.error(f"Error retiring equipment: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def get_equipment_usage_history(equipment_id: int) -> List[Dict[str, Any]]:
    """Get usage history for equipment"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            SELECT * FROM equipment_usage
            WHERE equipment_id = %s
            ORDER BY usage_date DESC
        """, (equipment_id,))
        
        usage = cur.fetchall()
        return [dict(u) for u in usage]
        
    except Exception as e:
        logger.error(f"Error fetching usage history: {e}")
        return []
    finally:
        cur.close()
        conn.close()


def log_equipment_maintenance(
    equipment_id: int,
    maintenance_type: str,
    maintenance_date: date,
    cost: Optional[float] = None,
    notes: Optional[str] = None
) -> Dict[str, Any]:
    """Log equipment maintenance (cleaning, repairs, etc.)"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        cur.execute("""
            INSERT INTO equipment_maintenance (equipment_id, maintenance_type, maintenance_date, cost, notes)
            VALUES (%s, %s, %s, %s, %s)
            RETURNING maintenance_id
        """, (equipment_id, maintenance_type, maintenance_date, cost, notes))
        
        maintenance = cur.fetchone()
        conn.commit()
        
        return {
            "success": True,
            "maintenance_id": maintenance["maintenance_id"],
            "message": f"Maintenance logged for equipment"
        }
        
    except Exception as e:
        logger.error(f"Error logging maintenance: {e}")
        conn.rollback()
        return {"success": False, "error": str(e)}
    finally:
        cur.close()
        conn.close()


def get_equipment_analytics(user_id: str) -> Dict[str, Any]:
    """Get equipment analytics and insights"""
    conn = get_db_connection()
    cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
    
    try:
        # Total miles across all equipment
        cur.execute("""
            SELECT 
                equipment_type,
                COUNT(*) as count,
                SUM(current_mileage - initial_mileage) as total_miles,
                AVG(current_mileage - initial_mileage) as avg_miles_per_item
            FROM equipment
            WHERE user_id = %s
            GROUP BY equipment_type
        """, (user_id,))
        
        equipment_stats = cur.fetchall()
        
        # Most used equipment
        cur.execute("""
            SELECT 
                e.equipment_id,
                e.brand,
                e.model,
                e.equipment_type,
                e.current_mileage - e.initial_mileage as total_miles
            FROM equipment e
            WHERE e.user_id = %s
            ORDER BY (e.current_mileage - e.initial_mileage) DESC
            LIMIT 5
        """, (user_id,))
        
        most_used = cur.fetchall()
        
        # Equipment needing replacement
        alerts = get_equipment_alerts(user_id)
        
        return {
            "equipment_stats": [dict(stat) for stat in equipment_stats],
            "most_used": [dict(item) for item in most_used],
            "replacement_alerts": alerts,
            "total_equipment": sum(stat["count"] for stat in equipment_stats)
        }
        
    except Exception as e:
        logger.error(f"Error fetching equipment analytics: {e}")
        return {}
    finally:
        cur.close()
        conn.close()


def get_replacement_recommendations(user_id: str) -> List[Dict[str, Any]]:
    """Get personalized equipment replacement recommendations"""
    alerts = get_equipment_alerts(user_id)
    
    recommendations = []
    for alert in alerts:
        if alert["health"]["status"] in ["warning", "critical"]:
            recommendation = {
                "equipment_id": alert["equipment_id"],
                "current": f"{alert['brand']} {alert['model']}",
                "reason": alert["health"]["message"],
                "urgency": alert["alert_level"],
                "suggestions": get_similar_equipment_suggestions(alert["type"], alert["brand"])
            }
            recommendations.append(recommendation)
    
    return recommendations


def get_similar_equipment_suggestions(equipment_type: str, current_brand: str) -> List[str]:
    """Get suggestions for similar equipment (could integrate with product API)"""
    suggestions = {
        "training_shoes": [
            "Nike Air Zoom Pegasus",
            "Adidas Adizero Boston",
            "Brooks Ghost",
            "ASICS Gel-Nimbus",
            "Hoka Clifton"
        ],
        "racing_spikes": [
            "Nike Superfly Elite",
            "Adidas Adizero Prime SP",
            "New Balance MD-X",
            "Puma evoSPEED Sprint"
        ],
        "racing_flats": [
            "Nike Zoom Victory",
            "Adidas Adizero Takumi Sen",
            "Saucony Endorphin Pro"
        ]
    }
    
    # Return suggestions for equipment type, excluding current brand if possible
    all_suggestions = suggestions.get(equipment_type, [])
    return [s for s in all_suggestions if current_brand.lower() not in s.lower()][:3]


# Initialize tables on import
try:
    create_equipment_tables()
except Exception as e:
    logger.warning(f"Could not create equipment tables: {e}")
