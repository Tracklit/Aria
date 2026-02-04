# Azure Speech Services Integration - Voice Features

## Overview

Aria now supports voice interactions powered by Azure Speech Services and Azure Translator. Athletes can:
- 🎤 Ask questions using voice instead of typing
- 🔊 Receive audio responses from Aria
- 🌍 Communicate in multiple languages
- 🗣️ Natural conversation flow with automatic transcription

## Features

### 1. Speech-to-Text (Audio Transcription)
Convert audio recordings to text with high accuracy.

**Endpoint**: `POST /voice/transcribe`

**Supported Audio Formats**:
- WAV
- MP3
- OGG
- FLAC

**Supported Languages**:
- English (en-US, en-GB)
- Spanish (es-ES, es-MX)
- French (fr-FR)
- German (de-DE)
- Italian (it-IT)
- Portuguese (pt-BR)
- And 90+ more languages

### 2. Text-to-Speech (Voice Synthesis)
Convert Aria's text responses to natural-sounding speech.

**Endpoint**: `POST /voice/synthesize`

**Available Voices**:
- **en-US-AriaNeural** (default) - Warm, supportive female voice
- **en-US-GuyNeural** - Professional male voice
- **es-ES-ElviraNeural** - Spanish female voice
- And 400+ neural voices across languages

### 3. Voice Conversations
Complete end-to-end voice interaction with Aria.

**Endpoint**: `POST /voice/ask`

**Flow**:
1. User speaks question → Audio sent to API
2. API transcribes audio → Text extracted
3. AI processes question → Generates response
4. Response synthesized → Audio returned
5. Both text and audio available

### 4. Multi-Language Support
Automatic language detection and translation.

**Capabilities**:
- Detect user's language automatically
- Translate questions to English for AI processing
- Translate responses back to user's language
- Support for 100+ languages

## API Endpoints

### Transcribe Audio

```http
POST /voice/transcribe
Content-Type: multipart/form-data

Parameters:
- audio: File (required) - Audio file to transcribe
- language: String (optional) - Language code (e.g., "en-US", "es-ES")
```

**Example (Python)**:
```python
import requests

with open("question.mp3", "rb") as audio_file:
    response = requests.post(
        "https://aria-dev-api.azurewebsites.net/voice/transcribe",
        files={"audio": audio_file},
        params={"language": "en-US"}
    )
    
result = response.json()
print(f"Transcribed: {result['text']}")
print(f"Confidence: {result['confidence']}")
```

**Response**:
```json
{
  "text": "What exercises should I do for speed training?",
  "confidence": 0.95,
  "metadata": {
    "duration_ms": 3500,
    "language": "en-US",
    "offset_ms": 0
  },
  "success": true
}
```

### Synthesize Speech

```http
POST /voice/synthesize
Content-Type: application/json

Body:
{
  "text": "Great job on your workout today!",
  "voice_name": "en-US-AriaNeural",  // optional
  "language": "en-US"  // optional
}
```

**Example (JavaScript)**:
```javascript
const response = await fetch('https://aria-dev-api.azurewebsites.net/voice/synthesize', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    text: "Great job on your workout today!",
    voice_name: "en-US-AriaNeural"
  })
});

const result = await response.json();
const audioData = atob(result.audio_base64);  // Decode base64
// Play audio or save to file
```

**Response**:
```json
{
  "audio_base64": "SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjU4L...",
  "metadata": {
    "duration_ms": 2500,
    "voice": "en-US-AriaNeural",
    "text_length": 33,
    "audio_size_bytes": 45678
  },
  "success": true
}
```

### Voice Conversation

```http
POST /voice/ask
Content-Type: multipart/form-data

Parameters:
- audio: File (required) - Audio file with user's question
- user_id: String (required) - User identifier
- language: String (optional) - Input language code
- response_language: String (optional) - Desired response language
```

**Example (cURL)**:
```bash
curl -X POST "https://aria-dev-api.azurewebsites.net/voice/ask" \
  -F "audio=@question.mp3" \
  -F "user_id=11" \
  -F "language=en-US" \
  -F "response_language=en-US"
```

**Response**:
```json
{
  "user_input": "Give me a motivational tip for today",
  "ai_response": "Remember, every step forward is progress! Focus on consistency over perfection.",
  "transcription_metadata": {
    "duration_ms": 2800,
    "language": "en-US",
    "offset_ms": 0
  },
  "audio_response": {
    "audio_base64": "SUQzBAAAAAAAI1RTU0UAAAA...",
    "metadata": {
      "duration_ms": 4500,
      "voice": "en-US-AriaNeural",
      "text_length": 89,
      "audio_size_bytes": 67890
    }
  },
  "success": true
}
```

### Check Voice Status

```http
GET /voice/status
```

**Response**:
```json
{
  "available": {
    "speech_recognition": true,
    "speech_synthesis": true,
    "translation": true
  },
  "speech_recognition": true,
  "speech_synthesis": true,
  "translation": true
}
```

## Configuration

### Environment Variables

Add these to your `.env` file or Azure App Service configuration:

```bash
# Azure Speech Services
AZURE_SPEECH_KEY=your-azure-speech-key
AZURE_SPEECH_REGION=westus
SPEECH_LANGUAGE=en-US
SPEECH_VOICE_NAME=en-US-AriaNeural

# Azure Translator
AZURE_TRANSLATOR_KEY=your-azure-translator-key
AZURE_TRANSLATOR_REGION=westus
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
```

### Get API Keys from Azure

**Speech Services**:
```bash
# Get Speech key
az cognitiveservices account keys list \
  --name aria-speech-dev \
  --resource-group rg-tracklit-dev \
  --query "key1" -o tsv
```

**Translator**:
```bash
# Get Translator key
az cognitiveservices account keys list \
  --name aria-translator-dev \
  --resource-group rg-tracklit-dev \
  --query "key1" -o tsv
```

## Integration Examples

### TrackLit Mobile App (React Native)

```javascript
import { Audio } from 'expo-av';

// Record audio
async function askAriaByVoice() {
  const recording = new Audio.Recording();
  await recording.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
  await recording.startAsync();
  
  // ... user speaks ...
  
  await recording.stopAndUnloadAsync();
  const uri = recording.getURI();
  
  // Send to Aria
  const formData = new FormData();
  formData.append('audio', {
    uri: uri,
    type: 'audio/m4a',
    name: 'question.m4a',
  });
  formData.append('user_id', userId);
  
  const response = await fetch('https://aria-dev-api.azurewebsites.net/voice/ask', {
    method: 'POST',
    body: formData,
  });
  
  const result = await response.json();
  
  // Play audio response
  const sound = new Audio.Sound();
  await sound.loadAsync({ uri: `data:audio/mp3;base64,${result.audio_response.audio_base64}` });
  await sound.playAsync();
  
  return result;
}
```

### Python Client

```python
import requests
import base64
from pathlib import Path

def ask_aria_voice(audio_file_path: str, user_id: str):
    """Send voice question to Aria and get audio response"""
    
    # Read audio file
    with open(audio_file_path, 'rb') as f:
        audio_data = f.read()
    
    # Send to API
    response = requests.post(
        'https://aria-dev-api.azurewebsites.net/voice/ask',
        files={'audio': audio_data},
        data={'user_id': user_id}
    )
    
    result = response.json()
    
    print(f"You: {result['user_input']}")
    print(f"Aria: {result['ai_response']}")
    
    # Save audio response
    if result['audio_response']:
        audio_bytes = base64.b64decode(result['audio_response']['audio_base64'])
        with open('aria_response.mp3', 'wb') as f:
            f.write(audio_bytes)
        print("Audio saved to aria_response.mp3")
    
    return result

# Usage
ask_aria_voice("my_question.mp3", "11")
```

## Use Cases

### 1. Hands-Free Training Feedback
- Athletes can ask questions during warm-up without stopping
- Voice responses while on the track
- No need to look at phone screen

### 2. Accessibility
- Visual impairments: Full voice navigation
- Dyslexia: Audio-first interaction
- Improved user experience for all

### 3. Multi-Language Support
- Spanish-speaking athletes in Latin America
- French athletes in Europe
- Portuguese speakers in Brazil
- Automatic translation both ways

### 4. Natural Conversations
- More engaging than text-only
- Feels like talking to a real coach
- Emotional tone conveyed through voice

## Performance

### Latency
- **Transcription**: 500-1500ms (depends on audio length)
- **Synthesis**: 300-800ms (depends on text length)
- **Full conversation**: 2-4 seconds end-to-end

### Audio Quality
- **Output format**: MP3, 16 kHz, 32 kbps
- **File size**: ~4 KB per second of audio
- **Voice quality**: Neural TTS (human-like)

### Cost Optimization
- Cache common responses
- Batch process when possible
- Use standard tier for development

## Troubleshooting

### "Speech Services not configured"
**Solution**: Set `AZURE_SPEECH_KEY` environment variable

### "No speech detected in audio"
**Causes**:
- Audio file too quiet
- Wrong audio format
- Background noise
**Solution**: Improve audio quality, use supported formats

### "Translation Services not configured"
**Solution**: Set `AZURE_TRANSLATOR_KEY` for multi-language support

### Check Service Status
```bash
curl https://aria-dev-api.azurewebsites.net/voice/status
```

## Database Schema

Voice interactions are logged in the `voice_interactions` table:

```sql
CREATE TABLE voice_interactions (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(255) NOT NULL,
    interaction_type VARCHAR(50) NOT NULL,  -- 'transcription', 'synthesis', 'conversation'
    input_text TEXT,
    output_text TEXT,
    audio_duration_seconds INTEGER,
    language VARCHAR(10),
    voice_name VARCHAR(100),
    confidence_score FLOAT,
    audio_size_bytes INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES athlete_profiles(user_id) ON DELETE CASCADE
);
```

### Run Migration

```bash
python scripts/add_voice_interactions_table.py
```

## Testing

Run voice integration tests:

```bash
pytest tests/test_voice_integration.py -v
```

Test coverage:
- ✅ Speech recognition (transcription)
- ✅ Speech synthesis (TTS)
- ✅ Language detection
- ✅ Translation
- ✅ Full conversation flow
- ✅ Error handling
- ✅ Edge cases

## Security

### API Key Protection
- Store keys in Azure Key Vault
- Use managed identity in production
- Never commit keys to Git

### Audio Data
- Audio files not stored permanently
- Transcriptions logged for analysis
- GDPR compliance: user can request deletion

### Rate Limiting
- Same rate limits as other endpoints
- 30 requests/minute for voice endpoints
- Prevents abuse

## Future Enhancements

- [ ] Real-time streaming (live audio)
- [ ] Voice commands ("Hey Aria...")
- [ ] Emotion detection in voice
- [ ] Speaker identification
- [ ] Background noise cancellation
- [ ] Custom voice profiles

## Resources

- [Azure Speech Services Docs](https://learn.microsoft.com/azure/cognitive-services/speech-service/)
- [Azure Translator Docs](https://learn.microsoft.com/azure/cognitive-services/translator/)
- [Supported Languages](https://learn.microsoft.com/azure/cognitive-services/speech-service/language-support)
- [Neural Voices List](https://learn.microsoft.com/azure/cognitive-services/speech-service/language-support?tabs=tts)

---

**Version**: 1.0.0  
**Last Updated**: January 2026  
**Status**: Production-Ready
