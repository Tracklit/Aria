"""
Notification System for Aria
Handles push notifications, emails, SMS, and webhooks
"""
from typing import Dict, Any, List, Optional
import os
import logging
from datetime import datetime
import requests
import json
from azure.communication.email import EmailClient
from azure.communication.sms import SmsClient

logger = logging.getLogger(__name__)


class NotificationService:
    """Centralized notification service for all communication channels"""
    
    def __init__(self):
        self.email_enabled = bool(os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING"))
        self.sms_enabled = bool(os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING"))
        self.webhook_enabled = bool(os.getenv("TRACKLIT_WEBHOOK_URL"))
        
        if self.email_enabled:
            self.email_client = EmailClient.from_connection_string(
                os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING")
            )
        
        if self.sms_enabled:
            self.sms_client = SmsClient.from_connection_string(
                os.getenv("AZURE_COMMUNICATION_CONNECTION_STRING")
            )
        
        self.tracklit_webhook_url = os.getenv("TRACKLIT_WEBHOOK_URL")
        self.tracklit_api_key = os.getenv("TRACKLIT_API_KEY")
        
        logger.info(f"Notification service initialized - Email: {self.email_enabled}, SMS: {self.sms_enabled}, Webhooks: {self.webhook_enabled}")
    
    async def send_email(
        self, 
        to_email: str, 
        subject: str, 
        html_content: str,
        from_email: str = None
    ) -> Dict[str, Any]:
        """Send email notification"""
        if not self.email_enabled:
            logger.warning("Email service not configured")
            return {"success": False, "error": "Email service not enabled"}
        
        try:
            from_email = from_email or os.getenv("AZURE_COMMUNICATION_FROM_EMAIL", "noreply@aria.app")
            
            message = {
                "senderAddress": from_email,
                "recipients": {
                    "to": [{"address": to_email}]
                },
                "content": {
                    "subject": subject,
                    "html": html_content
                }
            }
            
            poller = self.email_client.begin_send(message)
            result = poller.result()
            
            logger.info(f"Email sent to {to_email}: {subject}")
            return {
                "success": True,
                "message_id": result.id,
                "status": result.status
            }
            
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_sms(self, to_phone: str, message: str) -> Dict[str, Any]:
        """Send SMS notification"""
        if not self.sms_enabled:
            logger.warning("SMS service not configured")
            return {"success": False, "error": "SMS service not enabled"}
        
        try:
            from_phone = os.getenv("AZURE_COMMUNICATION_PHONE_NUMBER")
            if not from_phone:
                return {"success": False, "error": "No from phone number configured"}
            
            response = self.sms_client.send(
                from_=from_phone,
                to=to_phone,
                message=message
            )
            
            logger.info(f"SMS sent to {to_phone}")
            return {
                "success": True,
                "message_id": response.message_id,
                "to": to_phone
            }
            
        except Exception as e:
            logger.error(f"Failed to send SMS to {to_phone}: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_push_notification(
        self, 
        user_id: str, 
        title: str, 
        body: str,
        data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Send push notification via TrackLit platform"""
        if not self.webhook_enabled:
            logger.warning("Webhook service not configured")
            return {"success": False, "error": "Webhook service not enabled"}
        
        try:
            payload = {
                "type": "push_notification",
                "user_id": user_id,
                "notification": {
                    "title": title,
                    "body": body,
                    "data": data or {},
                    "timestamp": datetime.now().isoformat()
                }
            }
            
            response = requests.post(
                f"{self.tracklit_webhook_url}/notifications/push",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": self.tracklit_api_key
                },
                json=payload,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Push notification sent to user {user_id}: {title}")
                return {"success": True, "user_id": user_id}
            else:
                logger.error(f"Failed to send push notification: {response.status_code}")
                return {"success": False, "error": f"Status {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Failed to send push notification to user {user_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def send_webhook(
        self, 
        event_type: str, 
        data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Send webhook to TrackLit platform"""
        if not self.webhook_enabled:
            logger.warning("Webhook service not configured")
            return {"success": False, "error": "Webhook service not enabled"}
        
        try:
            payload = {
                "event": event_type,
                "timestamp": datetime.now().isoformat(),
                "data": data,
                "source": "aria_api"
            }
            
            response = requests.post(
                f"{self.tracklit_webhook_url}/webhooks/aria",
                headers={
                    "Content-Type": "application/json",
                    "X-API-Key": self.tracklit_api_key,
                    "X-Webhook-Signature": self._generate_signature(payload)
                },
                json=payload,
                timeout=10
            )
            
            if response.status_code in [200, 201]:
                logger.info(f"Webhook sent: {event_type}")
                return {"success": True, "event": event_type}
            else:
                logger.error(f"Webhook failed: {response.status_code}")
                return {"success": False, "error": f"Status {response.status_code}"}
                
        except Exception as e:
            logger.error(f"Failed to send webhook {event_type}: {e}")
            return {"success": False, "error": str(e)}
    
    def _generate_signature(self, payload: Dict[str, Any]) -> str:
        """Generate HMAC signature for webhook verification"""
        import hmac
        import hashlib
        
        secret = os.getenv("WEBHOOK_SECRET", "default_secret")
        payload_str = json.dumps(payload, sort_keys=True)
        signature = hmac.new(
            secret.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    async def notify_achievement(
        self, 
        user_id: str, 
        achievement_title: str,
        achievement_description: str,
        user_email: str = None,
        user_phone: str = None
    ) -> Dict[str, Any]:
        """Send multi-channel notification for achievement"""
        results = {}
        
        # Push notification
        push_result = await self.send_push_notification(
            user_id,
            f"🏆 {achievement_title}",
            achievement_description,
            {"type": "achievement", "user_id": user_id}
        )
        results["push"] = push_result
        
        # Email notification (optional)
        if user_email:
            html_content = f"""
            <html>
            <body>
                <h2>🏆 Congratulations!</h2>
                <h3>{achievement_title}</h3>
                <p>{achievement_description}</p>
                <p>Keep up the great work!</p>
                <p>- Aria AI Coach</p>
            </body>
            </html>
            """
            email_result = await self.send_email(
                user_email,
                f"Achievement Unlocked: {achievement_title}",
                html_content
            )
            results["email"] = email_result
        
        # Webhook to TrackLit
        webhook_result = await self.send_webhook(
            "achievement_earned",
            {
                "user_id": user_id,
                "achievement": {
                    "title": achievement_title,
                    "description": achievement_description
                }
            }
        )
        results["webhook"] = webhook_result
        
        return results
    
    async def notify_training_reminder(
        self,
        user_id: str,
        message: str,
        scheduled_workout: Dict[str, Any] = None,
        user_email: str = None,
        user_phone: str = None
    ) -> Dict[str, Any]:
        """Send training reminder notification"""
        results = {}
        
        # Push notification
        push_result = await self.send_push_notification(
            user_id,
            "🏃 Training Reminder",
            message,
            {"type": "training_reminder", "workout": scheduled_workout}
        )
        results["push"] = push_result
        
        # SMS notification (optional)
        if user_phone:
            sms_result = await self.send_sms(
                user_phone,
                f"Aria: {message}"
            )
            results["sms"] = sms_result
        
        return results
    
    async def notify_injury_alert(
        self,
        user_id: str,
        injury_type: str,
        severity: str,
        user_email: str = None
    ) -> Dict[str, Any]:
        """Send injury alert notification"""
        results = {}
        
        message = f"⚠️ Injury Alert: {injury_type} ({severity}). Please take appropriate rest and recovery."
        
        # Push notification
        push_result = await self.send_push_notification(
            user_id,
            "⚠️ Injury Alert",
            message,
            {"type": "injury_alert", "injury_type": injury_type, "severity": severity}
        )
        results["push"] = push_result
        
        # Email notification
        if user_email:
            html_content = f"""
            <html>
            <body>
                <h2>⚠️ Injury Alert</h2>
                <p><strong>Injury:</strong> {injury_type}</p>
                <p><strong>Severity:</strong> {severity}</p>
                <p>Please prioritize rest and recovery. Consider consulting a medical professional.</p>
                <p>Aria will adjust your training recommendations accordingly.</p>
                <p>- Aria AI Coach</p>
            </body>
            </html>
            """
            email_result = await self.send_email(
                user_email,
                f"Injury Alert: {injury_type}",
                html_content
            )
            results["email"] = email_result
        
        # Webhook to TrackLit
        webhook_result = await self.send_webhook(
            "injury_reported",
            {
                "user_id": user_id,
                "injury_type": injury_type,
                "severity": severity,
                "timestamp": datetime.now().isoformat()
            }
        )
        results["webhook"] = webhook_result
        
        return results


# Singleton instance
notification_service = NotificationService()
