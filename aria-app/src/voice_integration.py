"""
Azure Speech and Translation Services Integration
Provides voice-to-text, text-to-speech, and multi-language translation
"""
import os
import io
import logging
from typing import Optional, Dict, List, Tuple
from datetime import datetime
import azure.cognitiveservices.speech as speechsdk
from azure.ai.translation.text import TextTranslationClient
from azure.core.credentials import AzureKeyCredential
from azure.core.exceptions import AzureError

logger = logging.getLogger(__name__)


class VoiceIntegration:
    """Azure Speech and Translation Services integration"""
    
    def __init__(self):
        """Initialize Azure Speech and Translation clients"""
        # Speech Services configuration
        self.speech_key = os.getenv("AZURE_SPEECH_KEY")
        self.speech_region = os.getenv("AZURE_SPEECH_REGION", "westus")
        self.speech_language = os.getenv("SPEECH_LANGUAGE", "en-US")
        self.speech_voice = os.getenv("SPEECH_VOICE_NAME", "en-US-AriaNeural")
        
        # Translation Services configuration
        self.translator_key = os.getenv("AZURE_TRANSLATOR_KEY")
        self.translator_region = os.getenv("AZURE_TRANSLATOR_REGION", "westus")
        self.translator_endpoint = os.getenv(
            "AZURE_TRANSLATOR_ENDPOINT",
            "https://api.cognitive.microsofttranslator.com"
        )
        
        # Initialize clients
        self._init_speech_config()
        self._init_translation_client()
        
        logger.info("Voice integration initialized successfully")
    
    def _init_speech_config(self):
        """Initialize Speech Services configuration"""
        if not self.speech_key:
            logger.warning("AZURE_SPEECH_KEY not set - voice features will be disabled")
            self.speech_config = None
            return
        
        try:
            self.speech_config = speechsdk.SpeechConfig(
                subscription=self.speech_key,
                region=self.speech_region
            )
            self.speech_config.speech_recognition_language = self.speech_language
            self.speech_config.speech_synthesis_voice_name = self.speech_voice
            
            # Set audio format for high quality
            self.speech_config.set_speech_synthesis_output_format(
                speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
            )
            
            logger.info(f"Speech config initialized: {self.speech_region}, {self.speech_language}")
        except Exception as e:
            logger.error(f"Failed to initialize speech config: {e}")
            self.speech_config = None
    
    def _init_translation_client(self):
        """Initialize Translation Services client"""
        if not self.translator_key:
            logger.warning("AZURE_TRANSLATOR_KEY not set - translation features will be disabled")
            self.translation_client = None
            return
        
        try:
            credential = AzureKeyCredential(self.translator_key)
            self.translation_client = TextTranslationClient(
                credential=credential,
                region=self.translator_region
            )
            logger.info(f"Translation client initialized: {self.translator_region}")
        except Exception as e:
            logger.error(f"Failed to initialize translation client: {e}")
            self.translation_client = None
    
    def transcribe_audio(
        self,
        audio_data: bytes,
        language: Optional[str] = None
    ) -> Tuple[str, float, Dict]:
        """
        Convert speech audio to text using Azure Speech Services
        
        Args:
            audio_data: Audio file bytes (WAV, MP3, etc.)
            language: Optional language code (e.g., "en-US", "es-ES")
        
        Returns:
            Tuple of (transcribed_text, confidence_score, metadata)
        """
        if not self.speech_config:
            raise ValueError("Speech Services not configured. Set AZURE_SPEECH_KEY.")
        
        try:
            # Configure language if provided
            if language:
                recognition_config = speechsdk.SpeechConfig(
                    subscription=self.speech_key,
                    region=self.speech_region
                )
                recognition_config.speech_recognition_language = language
            else:
                recognition_config = self.speech_config
            
            # Create audio stream from bytes
            audio_stream = speechsdk.audio.PushAudioInputStream()
            audio_stream.write(audio_data)
            audio_stream.close()
            
            audio_config = speechsdk.audio.AudioConfig(stream=audio_stream)
            
            # Create recognizer and perform recognition
            recognizer = speechsdk.SpeechRecognizer(
                speech_config=recognition_config,
                audio_config=audio_config
            )
            
            result = recognizer.recognize_once()
            
            # Process result
            if result.reason == speechsdk.ResultReason.RecognizedSpeech:
                confidence = getattr(result, 'confidence', 0.0)
                metadata = {
                    "duration_ms": result.duration.total_seconds() * 1000,
                    "language": language or self.speech_language,
                    "offset_ms": result.offset / 10000,  # Convert to milliseconds
                }
                logger.info(f"Speech recognized: {len(result.text)} chars, confidence: {confidence}")
                return result.text, confidence, metadata
            
            elif result.reason == speechsdk.ResultReason.NoMatch:
                logger.warning("No speech could be recognized")
                raise ValueError("No speech detected in audio")
            
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                logger.error(f"Speech recognition canceled: {cancellation.reason}")
                if cancellation.reason == speechsdk.CancellationReason.Error:
                    raise ValueError(f"Recognition error: {cancellation.error_details}")
                raise ValueError("Speech recognition was canceled")
            
            else:
                raise ValueError(f"Unexpected recognition result: {result.reason}")
        
        except AzureError as e:
            logger.error(f"Azure Speech API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Speech transcription error: {e}")
            raise
    
    def synthesize_speech(
        self,
        text: str,
        voice_name: Optional[str] = None,
        language: Optional[str] = None
    ) -> Tuple[bytes, Dict]:
        """
        Convert text to speech audio using Azure Speech Services
        
        Args:
            text: Text to convert to speech
            voice_name: Optional voice name (e.g., "en-US-AriaNeural")
            language: Optional language code (affects voice if not specified)
        
        Returns:
            Tuple of (audio_bytes, metadata)
        """
        if not self.speech_config:
            raise ValueError("Speech Services not configured. Set AZURE_SPEECH_KEY.")
        
        try:
            # Configure voice if provided
            synthesis_config = speechsdk.SpeechConfig(
                subscription=self.speech_key,
                region=self.speech_region
            )
            
            if voice_name:
                synthesis_config.speech_synthesis_voice_name = voice_name
            elif language:
                # Map language to default voice
                voice_map = {
                    "en-US": "en-US-AriaNeural",
                    "es-ES": "es-ES-ElviraNeural",
                    "fr-FR": "fr-FR-DeniseNeural",
                    "de-DE": "de-DE-KatjaNeural",
                    "it-IT": "it-IT-ElsaNeural",
                    "pt-BR": "pt-BR-FranciscaNeural",
                }
                synthesis_config.speech_synthesis_voice_name = voice_map.get(
                    language,
                    self.speech_voice
                )
            else:
                synthesis_config.speech_synthesis_voice_name = self.speech_voice
            
            # Set output format
            synthesis_config.set_speech_synthesis_output_format(
                speechsdk.SpeechSynthesisOutputFormat.Audio16Khz32KBitRateMonoMp3
            )
            
            # Create synthesizer
            synthesizer = speechsdk.SpeechSynthesizer(
                speech_config=synthesis_config,
                audio_config=None  # Output to memory
            )
            
            # Perform synthesis
            result = synthesizer.speak_text_async(text).get()
            
            # Process result
            if result.reason == speechsdk.ResultReason.SynthesizingAudioCompleted:
                audio_data = result.audio_data
                metadata = {
                    "duration_ms": result.audio_duration.total_seconds() * 1000,
                    "voice": synthesis_config.speech_synthesis_voice_name,
                    "text_length": len(text),
                    "audio_size_bytes": len(audio_data),
                }
                logger.info(f"Speech synthesized: {len(text)} chars -> {len(audio_data)} bytes")
                return audio_data, metadata
            
            elif result.reason == speechsdk.ResultReason.Canceled:
                cancellation = result.cancellation_details
                logger.error(f"Speech synthesis canceled: {cancellation.reason}")
                if cancellation.reason == speechsdk.CancellationReason.Error:
                    raise ValueError(f"Synthesis error: {cancellation.error_details}")
                raise ValueError("Speech synthesis was canceled")
            
            else:
                raise ValueError(f"Unexpected synthesis result: {result.reason}")
        
        except AzureError as e:
            logger.error(f"Azure Speech API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Speech synthesis error: {e}")
            raise
    
    def detect_language(self, text: str) -> str:
        """
        Detect the language of text using Azure Translator
        
        Args:
            text: Text to detect language for
        
        Returns:
            Language code (e.g., "en", "es", "fr")
        """
        if not self.translation_client:
            raise ValueError("Translation Services not configured. Set AZURE_TRANSLATOR_KEY.")
        
        try:
            response = self.translation_client.detect_language(
                body=[{"text": text}]
            )
            
            if response and len(response) > 0:
                detected = response[0]
                language = detected.language
                confidence = detected.score
                logger.info(f"Language detected: {language} (confidence: {confidence})")
                return language
            
            raise ValueError("Language detection returned no results")
        
        except AzureError as e:
            logger.error(f"Azure Translator API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Language detection error: {e}")
            raise
    
    def translate_text(
        self,
        text: str,
        target_language: str,
        source_language: Optional[str] = None
    ) -> Tuple[str, Dict]:
        """
        Translate text using Azure Translator
        
        Args:
            text: Text to translate
            target_language: Target language code (e.g., "es", "fr", "de")
            source_language: Optional source language (auto-detected if not provided)
        
        Returns:
            Tuple of (translated_text, metadata)
        """
        if not self.translation_client:
            raise ValueError("Translation Services not configured. Set AZURE_TRANSLATOR_KEY.")
        
        try:
            # Prepare translation request
            body = [{"text": text}]
            
            # Translate
            if source_language:
                response = self.translation_client.translate(
                    body=body,
                    to_languages=[target_language],
                    from_language=source_language
                )
            else:
                response = self.translation_client.translate(
                    body=body,
                    to_languages=[target_language]
                )
            
            # Process response
            if response and len(response) > 0:
                translation_result = response[0]
                translated = translation_result.translations[0]
                
                metadata = {
                    "detected_language": getattr(translation_result.detected_language, 'language', source_language) if hasattr(translation_result, 'detected_language') else source_language,
                    "target_language": translated.to,
                    "confidence": getattr(translation_result.detected_language, 'score', 1.0) if hasattr(translation_result, 'detected_language') else 1.0,
                }
                
                logger.info(f"Text translated: {text[:50]}... -> {translated.text[:50]}...")
                return translated.text, metadata
            
            raise ValueError("Translation returned no results")
        
        except AzureError as e:
            logger.error(f"Azure Translator API error: {e}")
            raise
        except Exception as e:
            logger.error(f"Translation error: {e}")
            raise
    
    def process_voice_conversation(
        self,
        audio_data: bytes,
        user_language: Optional[str] = None,
        response_language: Optional[str] = None
    ) -> Dict:
        """
        Complete voice conversation flow: audio -> text -> (optional translation) -> processing
        
        Args:
            audio_data: Input audio bytes
            user_language: Optional user's language for recognition
            response_language: Optional language for response
        
        Returns:
            Dictionary with transcribed text, confidence, and metadata
        """
        try:
            # Step 1: Transcribe audio to text
            transcribed_text, confidence, audio_metadata = self.transcribe_audio(
                audio_data,
                language=user_language
            )
            
            # Step 2: Detect language if not provided
            if not user_language and self.translation_client:
                try:
                    detected_lang = self.detect_language(transcribed_text)
                    audio_metadata["detected_language"] = detected_lang
                except Exception as e:
                    logger.warning(f"Language detection failed: {e}")
            
            # Step 3: Translate to English if needed (for AI processing)
            original_text = transcribed_text
            if user_language and user_language not in ["en-US", "en-GB", "en"]:
                try:
                    lang_code = user_language.split("-")[0]  # Extract base language
                    if lang_code != "en":
                        transcribed_text, trans_metadata = self.translate_text(
                            transcribed_text,
                            target_language="en",
                            source_language=lang_code
                        )
                        audio_metadata["translation"] = trans_metadata
                        audio_metadata["original_text"] = original_text
                except Exception as e:
                    logger.warning(f"Translation to English failed: {e}")
            
            return {
                "text": transcribed_text,
                "confidence": confidence,
                "metadata": audio_metadata,
                "success": True
            }
        
        except Exception as e:
            logger.error(f"Voice conversation processing error: {e}")
            return {
                "text": "",
                "confidence": 0.0,
                "metadata": {"error": str(e)},
                "success": False
            }
    
    def is_available(self) -> Dict[str, bool]:
        """Check which services are available"""
        return {
            "speech_recognition": self.speech_config is not None,
            "speech_synthesis": self.speech_config is not None,
            "translation": self.translation_client is not None,
        }


# Global instance
voice_integration = VoiceIntegration()
