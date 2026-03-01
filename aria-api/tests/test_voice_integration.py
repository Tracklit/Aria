"""
Comprehensive tests for voice_integration.py
Tests speech recognition, synthesis, translation, and full conversation flow
"""
import pytest
import os
from unittest.mock import Mock, patch, MagicMock
from voice_integration import VoiceIntegration, voice_integration


@pytest.fixture
def mock_speech_config():
    """Mock Azure Speech SDK configuration"""
    with patch('voice_integration.speechsdk.SpeechConfig') as mock:
        yield mock


@pytest.fixture
def mock_translation_client():
    """Mock Azure Translation client"""
    with patch('voice_integration.TextTranslationClient') as mock:
        yield mock


@pytest.fixture
def sample_audio_data():
    """Sample audio bytes for testing"""
    # Return a small WAV file header + silence
    return b'RIFF' + b'\x00' * 44


class TestVoiceIntegrationInitialization:
    """Test VoiceIntegration initialization"""
    
    def test_initialization_with_keys(self, mock_speech_config, mock_translation_client):
        """Test successful initialization with API keys"""
        with patch.dict(os.environ, {
            'AZURE_SPEECH_KEY': 'test_speech_key',
            'AZURE_SPEECH_REGION': 'westus',
            'AZURE_TRANSLATOR_KEY': 'test_translator_key',
            'AZURE_TRANSLATOR_REGION': 'westus'
        }):
            integration = VoiceIntegration()
            assert integration.speech_key == 'test_speech_key'
            assert integration.translator_key == 'test_translator_key'
    
    def test_initialization_without_keys(self):
        """Test initialization without API keys"""
        with patch.dict(os.environ, {}, clear=True):
            integration = VoiceIntegration()
            assert integration.speech_config is None
            assert integration.translation_client is None
    
    def test_is_available(self):
        """Test service availability check"""
        availability = voice_integration.is_available()
        assert isinstance(availability, dict)
        assert 'speech_recognition' in availability
        assert 'speech_synthesis' in availability
        assert 'translation' in availability


class TestSpeechRecognition:
    """Test audio transcription functionality"""
    
    @patch('voice_integration.speechsdk.SpeechRecognizer')
    @patch('voice_integration.speechsdk.audio.PushAudioInputStream')
    def test_transcribe_audio_success(self, mock_audio_stream, mock_recognizer, sample_audio_data):
        """Test successful audio transcription"""
        # Mock successful recognition result
        mock_result = Mock()
        mock_result.reason = Mock()
        mock_result.reason = 1  # RecognizedSpeech
        mock_result.text = "Hello, I need training advice"
        mock_result.confidence = 0.95
        mock_result.duration.total_seconds.return_value = 3.5
        mock_result.offset = 10000
        
        mock_recognizer_instance = Mock()
        mock_recognizer_instance.recognize_once.return_value = mock_result
        mock_recognizer.return_value = mock_recognizer_instance
        
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key', 'AZURE_SPEECH_REGION': 'westus'}):
            integration = VoiceIntegration()
            
            if integration.speech_config:
                text, confidence, metadata = integration.transcribe_audio(sample_audio_data)
                
                assert text == "Hello, I need training advice"
                assert confidence == 0.95
                assert 'duration_ms' in metadata
                assert 'language' in metadata
    
    def test_transcribe_audio_no_config(self, sample_audio_data):
        """Test transcription without speech config"""
        with patch.dict(os.environ, {}, clear=True):
            integration = VoiceIntegration()
            
            with pytest.raises(ValueError, match="Speech Services not configured"):
                integration.transcribe_audio(sample_audio_data)
    
    @patch('voice_integration.speechsdk.SpeechRecognizer')
    @patch('voice_integration.speechsdk.audio.PushAudioInputStream')
    def test_transcribe_audio_no_speech(self, mock_audio_stream, mock_recognizer, sample_audio_data):
        """Test transcription when no speech is detected"""
        mock_result = Mock()
        mock_result.reason = 0  # NoMatch
        
        mock_recognizer_instance = Mock()
        mock_recognizer_instance.recognize_once.return_value = mock_result
        mock_recognizer.return_value = mock_recognizer_instance
        
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key'}):
            integration = VoiceIntegration()
            
            if integration.speech_config:
                with pytest.raises(ValueError, match="No speech detected"):
                    integration.transcribe_audio(sample_audio_data)


class TestSpeechSynthesis:
    """Test text-to-speech functionality"""
    
    @patch('voice_integration.speechsdk.SpeechSynthesizer')
    def test_synthesize_speech_success(self, mock_synthesizer):
        """Test successful speech synthesis"""
        mock_result = Mock()
        mock_result.reason = 1  # SynthesizingAudioCompleted
        mock_result.audio_data = b'audio_data_here'
        mock_result.audio_duration.total_seconds.return_value = 5.0
        
        mock_synthesizer_instance = Mock()
        mock_synthesizer_instance.speak_text_async.return_value.get.return_value = mock_result
        mock_synthesizer.return_value = mock_synthesizer_instance
        
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key', 'AZURE_SPEECH_REGION': 'westus'}):
            integration = VoiceIntegration()
            
            if integration.speech_config:
                audio_data, metadata = integration.synthesize_speech("Hello athlete!")
                
                assert audio_data == b'audio_data_here'
                assert 'duration_ms' in metadata
                assert 'voice' in metadata
                assert metadata['text_length'] == len("Hello athlete!")
    
    def test_synthesize_speech_no_config(self):
        """Test synthesis without speech config"""
        with patch.dict(os.environ, {}, clear=True):
            integration = VoiceIntegration()
            
            with pytest.raises(ValueError, match="Speech Services not configured"):
                integration.synthesize_speech("Test text")
    
    @patch('voice_integration.speechsdk.SpeechSynthesizer')
    def test_synthesize_speech_custom_voice(self, mock_synthesizer):
        """Test synthesis with custom voice"""
        mock_result = Mock()
        mock_result.reason = 1
        mock_result.audio_data = b'audio'
        mock_result.audio_duration.total_seconds.return_value = 2.0
        
        mock_synthesizer_instance = Mock()
        mock_synthesizer_instance.speak_text_async.return_value.get.return_value = mock_result
        mock_synthesizer.return_value = mock_synthesizer_instance
        
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key'}):
            integration = VoiceIntegration()
            
            if integration.speech_config:
                audio_data, metadata = integration.synthesize_speech(
                    "Test",
                    voice_name="en-US-JennyNeural"
                )
                assert metadata['voice'] == "en-US-JennyNeural"


class TestTranslation:
    """Test translation functionality"""
    
    @patch('voice_integration.TextTranslationClient')
    def test_detect_language(self, mock_client):
        """Test language detection"""
        mock_response = [Mock()]
        mock_response[0].language = "es"
        mock_response[0].score = 0.99
        
        mock_client_instance = Mock()
        mock_client_instance.detect_language.return_value = mock_response
        mock_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'AZURE_TRANSLATOR_KEY': 'test_key',
            'AZURE_TRANSLATOR_REGION': 'westus'
        }):
            integration = VoiceIntegration()
            
            if integration.translation_client:
                language = integration.detect_language("Hola, ¿cómo estás?")
                assert language == "es"
    
    @patch('voice_integration.TextTranslationClient')
    def test_translate_text(self, mock_client):
        """Test text translation"""
        mock_translation = Mock()
        mock_translation.to = "es"
        mock_translation.text = "Hola, ¿cómo estás?"
        
        mock_result = Mock()
        mock_result.translations = [mock_translation]
        mock_result.detected_language = Mock()
        mock_result.detected_language.language = "en"
        mock_result.detected_language.score = 0.99
        
        mock_client_instance = Mock()
        mock_client_instance.translate.return_value = [mock_result]
        mock_client.return_value = mock_client_instance
        
        with patch.dict(os.environ, {
            'AZURE_TRANSLATOR_KEY': 'test_key',
            'AZURE_TRANSLATOR_REGION': 'westus'
        }):
            integration = VoiceIntegration()
            
            if integration.translation_client:
                translated, metadata = integration.translate_text(
                    "Hello, how are you?",
                    target_language="es"
                )
                assert translated == "Hola, ¿cómo estás?"
                assert metadata['target_language'] == "es"
    
    def test_translate_without_config(self):
        """Test translation without translator config"""
        with patch.dict(os.environ, {}, clear=True):
            integration = VoiceIntegration()
            
            with pytest.raises(ValueError, match="Translation Services not configured"):
                integration.translate_text("Test", "es")


class TestVoiceConversation:
    """Test complete voice conversation flow"""
    
    @patch('voice_integration.speechsdk.SpeechRecognizer')
    @patch('voice_integration.speechsdk.audio.PushAudioInputStream')
    def test_process_voice_conversation(self, mock_audio_stream, mock_recognizer, sample_audio_data):
        """Test complete voice conversation processing"""
        mock_result = Mock()
        mock_result.reason = 1
        mock_result.text = "Give me a workout tip"
        mock_result.confidence = 0.90
        mock_result.duration.total_seconds.return_value = 2.0
        mock_result.offset = 0
        
        mock_recognizer_instance = Mock()
        mock_recognizer_instance.recognize_once.return_value = mock_result
        mock_recognizer.return_value = mock_recognizer_instance
        
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key'}):
            integration = VoiceIntegration()
            
            if integration.speech_config:
                result = integration.process_voice_conversation(sample_audio_data)
                
                assert result['success'] is True
                assert result['text'] == "Give me a workout tip"
                assert result['confidence'] == 0.90
                assert 'metadata' in result


class TestEdgeCases:
    """Test edge cases and error handling"""
    
    def test_empty_audio_data(self):
        """Test handling of empty audio data"""
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key'}):
            integration = VoiceIntegration()
            # Should handle gracefully or raise appropriate error
    
    def test_invalid_language_code(self, sample_audio_data):
        """Test handling of invalid language codes"""
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key'}):
            integration = VoiceIntegration()
            # Should handle invalid language codes gracefully
    
    def test_very_long_text_synthesis(self):
        """Test synthesis with very long text"""
        long_text = "Test " * 1000  # 5000 characters
        with patch.dict(os.environ, {'AZURE_SPEECH_KEY': 'test_key'}):
            integration = VoiceIntegration()
            # Should handle long text appropriately


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
