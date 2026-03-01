"""
Advanced Video Analysis for Aria
Frame extraction, pose estimation, and biomechanics assessment
"""
from typing import Dict, Any, List, Optional, Tuple
import os
import logging
import cv2
import numpy as np
from datetime import datetime
import base64
import tempfile
from azure.storage.blob import BlobServiceClient, ContentSettings
import mediapipe as mp

logger = logging.getLogger(__name__)


class VideoAnalysisService:
    """Advanced video analysis with pose estimation and biomechanics"""
    
    def __init__(self):
        self.blob_enabled = bool(os.getenv("AZURE_STORAGE_CONNECTION_STRING"))
        
        if self.blob_enabled:
            self.blob_service_client = BlobServiceClient.from_connection_string(
                os.getenv("AZURE_STORAGE_CONNECTION_STRING")
            )
            self.container_name = os.getenv("AZURE_STORAGE_CONTAINER_NAME", "aria-videos")
            self._ensure_container_exists()
        
        # Initialize MediaPipe Pose
        self.mp_pose = mp.solutions.pose
        self.mp_drawing = mp.solutions.drawing_utils
        self.pose = self.mp_pose.Pose(
            static_image_mode=False,
            model_complexity=2,
            enable_segmentation=False,
            min_detection_confidence=0.5,
            min_tracking_confidence=0.5
        )
        
        logger.info(f"Video analysis service initialized - Blob storage: {self.blob_enabled}")
    
    def _ensure_container_exists(self):
        """Ensure blob container exists"""
        try:
            container_client = self.blob_service_client.get_container_client(self.container_name)
            if not container_client.exists():
                container_client.create_container()
                logger.info(f"Created blob container: {self.container_name}")
        except Exception as e:
            logger.error(f"Error ensuring container exists: {e}")
    
    async def upload_video(
        self,
        user_id: str,
        video_data: bytes,
        video_filename: str,
        content_type: str = "video/mp4"
    ) -> Dict[str, Any]:
        """Upload video to Azure Blob Storage"""
        if not self.blob_enabled:
            return {"success": False, "error": "Blob storage not configured"}
        
        try:
            # Generate unique blob name
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            blob_name = f"users/{user_id}/videos/{timestamp}_{video_filename}"
            
            # Upload to blob storage
            blob_client = self.blob_service_client.get_blob_client(
                container=self.container_name,
                blob=blob_name
            )
            
            blob_client.upload_blob(
                video_data,
                overwrite=True,
                content_settings=ContentSettings(content_type=content_type)
            )
            
            # Get blob URL
            blob_url = blob_client.url
            
            logger.info(f"Video uploaded for user {user_id}: {blob_name}")
            return {
                "success": True,
                "blob_name": blob_name,
                "blob_url": blob_url,
                "size_bytes": len(video_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to upload video for user {user_id}: {e}")
            return {"success": False, "error": str(e)}
    
    async def extract_frames(
        self,
        video_path: str,
        num_frames: int = 10
    ) -> List[np.ndarray]:
        """Extract frames from video for analysis"""
        try:
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                logger.error(f"Could not open video: {video_path}")
                return []
            
            total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            frame_interval = max(1, total_frames // num_frames)
            
            frames = []
            frame_count = 0
            
            while cap.isOpened() and len(frames) < num_frames:
                ret, frame = cap.read()
                if not ret:
                    break
                
                if frame_count % frame_interval == 0:
                    frames.append(frame)
                
                frame_count += 1
            
            cap.release()
            
            logger.info(f"Extracted {len(frames)} frames from video")
            return frames
            
        except Exception as e:
            logger.error(f"Error extracting frames: {e}")
            return []
    
    async def analyze_pose(
        self,
        frame: np.ndarray
    ) -> Dict[str, Any]:
        """Analyze pose in a single frame using MediaPipe"""
        try:
            # Convert BGR to RGB
            image_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Process the image
            results = self.pose.process(image_rgb)
            
            if not results.pose_landmarks:
                return {"success": False, "error": "No pose detected"}
            
            # Extract landmark coordinates
            landmarks = {}
            for idx, landmark in enumerate(results.pose_landmarks.landmark):
                landmarks[idx] = {
                    "x": landmark.x,
                    "y": landmark.y,
                    "z": landmark.z,
                    "visibility": landmark.visibility
                }
            
            return {
                "success": True,
                "landmarks": landmarks,
                "landmark_count": len(landmarks)
            }
            
        except Exception as e:
            logger.error(f"Error analyzing pose: {e}")
            return {"success": False, "error": str(e)}
    
    async def calculate_sprint_metrics(
        self,
        landmarks: Dict[int, Dict[str, float]]
    ) -> Dict[str, Any]:
        """Calculate sprint-specific biomechanical metrics"""
        try:
            metrics = {}
            
            # Key landmarks for sprinting
            LEFT_HIP = 23
            RIGHT_HIP = 24
            LEFT_KNEE = 25
            RIGHT_KNEE = 26
            LEFT_ANKLE = 27
            RIGHT_ANKLE = 28
            LEFT_SHOULDER = 11
            RIGHT_SHOULDER = 12
            
            # Calculate knee angles
            if all(idx in landmarks for idx in [LEFT_HIP, LEFT_KNEE, LEFT_ANKLE]):
                left_knee_angle = self._calculate_angle(
                    landmarks[LEFT_HIP],
                    landmarks[LEFT_KNEE],
                    landmarks[LEFT_ANKLE]
                )
                metrics["left_knee_angle"] = left_knee_angle
            
            if all(idx in landmarks for idx in [RIGHT_HIP, RIGHT_KNEE, RIGHT_ANKLE]):
                right_knee_angle = self._calculate_angle(
                    landmarks[RIGHT_HIP],
                    landmarks[RIGHT_KNEE],
                    landmarks[RIGHT_ANKLE]
                )
                metrics["right_knee_angle"] = right_knee_angle
            
            # Calculate torso lean
            if all(idx in landmarks for idx in [LEFT_SHOULDER, LEFT_HIP]):
                torso_angle = self._calculate_torso_lean(
                    landmarks[LEFT_SHOULDER],
                    landmarks[LEFT_HIP]
                )
                metrics["torso_lean"] = torso_angle
            
            # Calculate stride width (approximate)
            if all(idx in landmarks for idx in [LEFT_ANKLE, RIGHT_ANKLE]):
                stride_width = abs(landmarks[LEFT_ANKLE]["x"] - landmarks[RIGHT_ANKLE]["x"])
                metrics["stride_width"] = stride_width
            
            return {
                "success": True,
                "metrics": metrics
            }
            
        except Exception as e:
            logger.error(f"Error calculating sprint metrics: {e}")
            return {"success": False, "error": str(e)}
    
    def _calculate_angle(
        self,
        point1: Dict[str, float],
        point2: Dict[str, float],
        point3: Dict[str, float]
    ) -> float:
        """Calculate angle between three points"""
        # Create vectors
        v1 = np.array([point1["x"] - point2["x"], point1["y"] - point2["y"]])
        v2 = np.array([point3["x"] - point2["x"], point3["y"] - point2["y"]])
        
        # Calculate angle
        cos_angle = np.dot(v1, v2) / (np.linalg.norm(v1) * np.linalg.norm(v2))
        angle = np.arccos(np.clip(cos_angle, -1.0, 1.0))
        
        return np.degrees(angle)
    
    def _calculate_torso_lean(
        self,
        shoulder: Dict[str, float],
        hip: Dict[str, float]
    ) -> float:
        """Calculate torso lean angle from vertical"""
        # Calculate angle from vertical
        dx = hip["x"] - shoulder["x"]
        dy = hip["y"] - shoulder["y"]
        
        angle = np.degrees(np.arctan2(dx, dy))
        return angle
    
    async def analyze_video_full(
        self,
        user_id: str,
        video_data: bytes,
        video_filename: str
    ) -> Dict[str, Any]:
        """Complete video analysis pipeline"""
        try:
            # Save video to temp file
            with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp_file:
                tmp_file.write(video_data)
                tmp_video_path = tmp_file.name
            
            # Upload to blob storage
            upload_result = await self.upload_video(user_id, video_data, video_filename)
            
            if not upload_result.get("success"):
                return upload_result
            
            # Extract frames
            frames = await self.extract_frames(tmp_video_path, num_frames=15)
            
            if not frames:
                return {"success": False, "error": "Could not extract frames"}
            
            # Analyze each frame
            frame_analyses = []
            for idx, frame in enumerate(frames):
                pose_result = await self.analyze_pose(frame)
                
                if pose_result.get("success"):
                    metrics_result = await self.calculate_sprint_metrics(
                        pose_result["landmarks"]
                    )
                    
                    frame_analyses.append({
                        "frame_number": idx,
                        "pose_detected": True,
                        "metrics": metrics_result.get("metrics", {})
                    })
                else:
                    frame_analyses.append({
                        "frame_number": idx,
                        "pose_detected": False
                    })
            
            # Calculate aggregate metrics
            aggregate_metrics = self._aggregate_frame_metrics(frame_analyses)
            
            # Clean up temp file
            os.unlink(tmp_video_path)
            
            return {
                "success": True,
                "video_url": upload_result.get("blob_url"),
                "frames_analyzed": len(frames),
                "frames_with_pose": sum(1 for f in frame_analyses if f["pose_detected"]),
                "aggregate_metrics": aggregate_metrics,
                "frame_analyses": frame_analyses
            }
            
        except Exception as e:
            logger.error(f"Error in full video analysis: {e}")
            return {"success": False, "error": str(e)}
    
    def _aggregate_frame_metrics(
        self,
        frame_analyses: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Aggregate metrics across all frames"""
        try:
            valid_frames = [f for f in frame_analyses if f.get("pose_detected")]
            
            if not valid_frames:
                return {}
            
            # Collect all metric values
            all_metrics = {}
            for frame in valid_frames:
                metrics = frame.get("metrics", {})
                for key, value in metrics.items():
                    if key not in all_metrics:
                        all_metrics[key] = []
                    all_metrics[key].append(value)
            
            # Calculate averages
            aggregate = {}
            for key, values in all_metrics.items():
                aggregate[f"avg_{key}"] = np.mean(values)
                aggregate[f"min_{key}"] = np.min(values)
                aggregate[f"max_{key}"] = np.max(values)
                aggregate[f"std_{key}"] = np.std(values)
            
            return aggregate
            
        except Exception as e:
            logger.error(f"Error aggregating metrics: {e}")
            return {}
    
    async def generate_feedback(
        self,
        aggregate_metrics: Dict[str, Any],
        user_experience: str = "intermediate"
    ) -> List[str]:
        """Generate actionable feedback from biomechanics analysis"""
        feedback = []
        
        try:
            # Knee angle feedback
            if "avg_left_knee_angle" in aggregate_metrics:
                avg_knee_angle = aggregate_metrics["avg_left_knee_angle"]
                
                if avg_knee_angle < 90:
                    feedback.append("⚠️ Your knee drive could be higher. Focus on bringing your knee up to 90 degrees or more during the drive phase.")
                elif avg_knee_angle > 120:
                    feedback.append("✓ Good knee lift! Your knee drive angle is in the optimal range.")
            
            # Torso lean feedback
            if "avg_torso_lean" in aggregate_metrics:
                torso_lean = aggregate_metrics["avg_torso_lean"]
                
                if abs(torso_lean) < 5:
                    feedback.append("⚠️ Your torso is too upright. Lean forward slightly from the ankles (5-10 degrees) for better acceleration.")
                elif abs(torso_lean) > 15:
                    feedback.append("⚠️ You're leaning too far forward. Maintain a slight forward lean (5-10 degrees) but avoid over-leaning.")
                else:
                    feedback.append("✓ Good torso position! Your forward lean is in the optimal range for acceleration.")
            
            # Stride width feedback
            if "avg_stride_width" in aggregate_metrics:
                stride_width = aggregate_metrics["avg_stride_width"]
                
                if stride_width > 0.3:
                    feedback.append("⚠️ Your stride is too wide. Keep your feet tracking in a straight line for maximum efficiency.")
                elif stride_width < 0.1:
                    feedback.append("⚠️ Your stride might be too narrow. Aim for feet landing slightly outside hip width.")
            
            # General feedback based on experience level
            if user_experience == "beginner":
                feedback.append("💡 Focus on maintaining good posture and rhythm. Quality over quantity!")
            elif user_experience == "advanced":
                feedback.append("💡 Fine-tune your mechanics by focusing on ground contact time and force application.")
            
            if not feedback:
                feedback.append("✓ Overall form looks good! Keep up the great work.")
            
            return feedback
            
        except Exception as e:
            logger.error(f"Error generating feedback: {e}")
            return ["Unable to generate feedback. Please try again."]


# Singleton instance
video_analysis_service = VideoAnalysisService()
