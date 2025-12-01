# NeuroLens 👁️

**Real-Time Accessibility AI Assistant for Visually Impaired Users**

NeuroLens is a privacy-first mobile application that empowers visually impaired individuals with a **Hybrid Intelligence Architecture**. It combines instant, on-device object detection (Arm-optimized) with deep scene understanding (Mistral AI) to deliver both safety and context.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-iOS%20%7C%20Android-lightgrey.svg)
![Arm Optimized](https://img.shields.io/badge/Arm-Optimized-green.svg)

## 🌟 Features

### 🎯 Core Capabilities

-   **Reflex Mode (Local)**: Instant object detection (<100ms) for obstacle avoidance using TensorFlow.js on Arm.
-   **Cognitive Mode (Cloud)**: Detailed scene description and Q&A using Mistral AI.
-   **Spatial Awareness**: Haptic feedback for object proximity.
-   **Voice-First Interface**: Fully controllable through voice commands.
-   **Hybrid Privacy**: Continuous video processing is local; only specific images are sent to cloud on demand.

### 🎨 Three Operating Modes

1.  **Reflex Mode** 👁️ - Instant safety warnings and object ID (Offline).
2.  **Cognitive Mode** 🧠 - "What do you see?" detailed descriptions (Online).
3.  **Navigation Mode** 🧭 - Directional guidance to specific objects.

## 🏗️ Architecture

NeuroLens leverages a **Hybrid Architecture** optimized for Arm:

-   **Local Layer**: TensorFlow.js (SSD MobileNet v2) running on Arm GPU via WebGL.
-   **Cloud Layer**: Mistral AI (Vision) for complex reasoning.
-   **Expo Camera**: Real-time video processing.
-   **Native TTS/STT**: Voice interface.

```
┌─────────────────────────────────────────┐
│           Camera Input                  │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┐
    │                 │
┌───▼────┐      ┌────▼─────┐
│ Local  │      │  Cloud   │
│ Reflex │      │Cognitive │
│ (TFJS) │      │(Mistral) │
└───┬────┘      └────┬─────┘
    │                │
    └────────┬───────┘
             │
        ┌────▼─────┐
        │  Output  │
        │ (Voice/  │
        │ Haptics) │
        └──────────┘
```

## 🚀 Getting Started

### Prerequisites

-   Node.js 20+
-   Expo Go app installed on your device

### Installation

1.  **Clone the repository**
    ```bash
    git clone https://github.com/saketh8/neurolens.git
    cd neurolens
    ```

2.  **Install dependencies**
    ```bash
    npm install
    ```

3.  **Start the development server**
    ```bash
    npx expo start --clear
    ```

4.  **Run on your device**
    -   Scan the QR code with Expo Go (Android) or Camera (iOS).

## 📱 Usage

### Basic Operation

1.  **Launch NeuroLens** - Grant camera permissions.
2.  **Reflex Mode (Default)** - Point at objects to hear them instantly. Works offline.
3.  **Cognitive Mode** - Tap the screen to ask for a detailed description.

### Voice Commands

-   "What do you see?" - Triggers Cognitive Mode description.
-   "Find exit" - Switches to Navigation Mode.

## 🛠️ Development

### Project Structure

```
NeuroLens/
├── App.tsx                 # Main app entry
├── src/
│   ├── screens/
│   │   └── CameraScreen.tsx    # Main camera interface
│   ├── services/
│   │   ├── VisionService.ts    # Local TFJS Object Detection
│   │   ├── MistralService.ts   # Cloud Scene Description
│   │   ├── VoiceService.ts     # TTS/STT
│   │   └── HapticService.ts    # Haptic feedback
│   └── utils/
└── package.json
```

## 🎯 Arm Optimization

NeuroLens is specifically optimized for Arm architecture:

-   **WebGL Acceleration** - Uses `tfjs-react-native` to access the Arm GPU.
-   **Quantized Models** - Uses efficient MobileNet v2 for low latency.
-   **Hybrid Offloading** - Only heavy tasks go to the cloud, saving battery.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

-   Built for the Arm AI Developer Challenge.
-   Powered by TensorFlow.js and Mistral AI.
