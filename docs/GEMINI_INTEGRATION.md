# Gemini API Integration for NeuroLens

## Overview

NeuroLens now supports **optional Gemini API integration** for enhanced scene descriptions while maintaining privacy-first on-device processing as the default.

## What's New

### 1. **GeminiService.ts** - Cloud-Enhanced AI
- Full Google Gemini API integration
- Enhanced scene descriptions with richer context
- Navigation guidance with natural language
- Question answering about scenes
- Direct image analysis using Gemini Vision
- Automatic fallback to on-device processing

### 2. **Updated LLMService.ts** - Hybrid Approach
- Tries Gemini API first when available
- Automatically falls back to local/template processing
- Seamless switching between cloud and on-device
- No code changes needed in other components

### 3. **SettingsScreen.tsx** - User Configuration
- API key input and storage
- Enable/disable Gemini toggle
- Voice settings (rate, pitch)
- Clear explanation of on-device vs enhanced modes
- Secure API key storage using AsyncStorage

### 4. **Enhanced CameraScreen.tsx**
- Loads Gemini settings on startup
- Settings button for easy access
- Announces Gemini status on launch
- Navigation integration

### 5. **App.tsx** - Navigation
- React Navigation setup
- Stack navigator for Camera and Settings screens
- Proper navigation flow

## How It Works

```
User Request
     ↓
LLMService.generateSceneDescription()
     ↓
Is Gemini Available? ───YES──→ Gemini API ──→ Rich Description
     ↓                              ↓
     NO                          (if fails)
     ↓                              ↓
Local ExecuTorch ←─────────────────┘
     ↓
Template Fallback
     ↓
Response to User
```

## User Experience

### First Time Setup
1. Launch NeuroLens
2. Tap settings button (⚙️)
3. Enable "Enable Gemini"
4. Enter Gemini API key
5. Save settings
6. Return to camera - enhanced mode active!

### On-Device Mode (Default)
- ✅ Complete privacy
- ✅ Works offline
- ✅ Fast processing
- ⚠️ Basic descriptions

### Gemini Enhanced Mode (Optional)
- ✅ Richer, more detailed descriptions
- ✅ Better context understanding
- ✅ Natural language responses
- ⚠️ Requires internet
- ⚠️ Data sent to Google

## API Key Setup

Users can get a free Gemini API key at: **https://ai.google.dev**

The app stores the API key securely in AsyncStorage and loads it automatically on startup.

## Benefits for Hackathon

### 1. **Best of Both Worlds**
- Privacy-first by default (on-device)
- Optional cloud enhancement for better quality
- Demonstrates flexibility and user choice

### 2. **Showcases Arm Optimization**
- On-device processing still the primary mode
- Gemini is an *enhancement*, not a replacement
- Proves Arm can handle sophisticated AI locally

### 3. **Better Demo Experience**
- Gemini provides much richer descriptions for demos
- Can show side-by-side comparison
- Impresses judges with quality

### 4. **Production Ready**
- Real API integration, not just placeholders
- Proper error handling and fallbacks
- User-friendly settings interface

## Technical Details

### Dependencies Added
```json
{
  "@google/generative-ai": "latest",
  "@react-native-async-storage/async-storage": "latest",
  "@react-navigation/native": "^6.1.9",
  "@react-navigation/stack": "^6.3.20"
}
```

### Storage Keys
- `@neurolens_gemini_key` - API key
- `@neurolens_gemini_enabled` - Enable/disable flag
- `@neurolens_voice_rate` - Speech rate
- `@neurolens_voice_pitch` - Voice pitch

### Gemini Model Used
- **gemini-2.0-flash-exp** - Latest experimental model
- Fast inference
- Excellent vision capabilities
- Great for accessibility use cases

## Example Comparisons

### On-Device (Template)
> "You're in an indoor area with moderate lighting. Close to you: chair, table. Further away: couch, lamp."

### Gemini Enhanced
> "You're in a cozy living room with warm, moderate lighting. Directly in front of you, about a meter away, there's a wooden dining chair next to a small coffee table. To your left, roughly 3 meters away, you'll find a comfortable-looking couch with a floor lamp beside it, perfect for reading."

## Future Enhancements

- [ ] Gemini Vision for direct image analysis (already implemented!)
- [ ] Caching for offline use of recent descriptions
- [ ] User preference for description verbosity
- [ ] Multi-language support via Gemini
- [ ] Cost tracking for API usage

## Hackathon Pitch Update

**New Selling Point**: "NeuroLens gives users choice—complete privacy with on-device AI, or enhanced descriptions with optional Gemini integration. It's the best of both worlds, proving that Arm-optimized mobile AI doesn't need to compromise."

---

**Status**: ✅ Fully implemented and ready to use!
