/**
 * CameraScreen - Main camera interface for NeuroLens
 * Real-time scene analysis with voice-first accessibility
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, Text, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import AsyncStorage from '@react-native-async-storage/async-storage';
import VisionService from '../services/VisionService';
import VoiceService from '../services/VoiceService';
import OCRService from '../services/OCRService';
import HapticService from '../services/HapticService';
import LLMService from '../services/LLMService';
import MistralService from '../services/MistralService';

const { width, height } = Dimensions.get('window');

export default function CameraScreen({ navigation }: any) {
    const [permission, requestPermission] = useCameraPermissions();
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentMode, setCurrentMode] = useState<'scene' | 'text' | 'navigate'>('scene');
    const cameraRef = useRef<any>(null);
    const processingInterval = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        initializeServices();
        return () => cleanup();
    }, []);

    const initializeServices = async () => {
        try {
            // Request camera permission
            if (!permission) {
                return;
            }

            if (!permission.granted) {
                const result = await requestPermission();
                if (!result.granted) {
                    await VoiceService.speak('Camera permission is required for NeuroLens to work', true);
                    return;
                }
            }

            // Load Mistral API key from storage
            try {
                const apiKey = await AsyncStorage.getItem('@neurolens_mistral_key');
                const enabled = await AsyncStorage.getItem('@neurolens_mistral_enabled');

                if (apiKey && enabled === 'true') {
                    await MistralService.initialize(apiKey);
                    console.log('Mistral Service loaded from saved settings');
                } else {
                    // Initialize with default key if enabled not explicitly false
                    // or if we want to enable it by default
                    await MistralService.initialize('TvkpxVoYWB8A2CVJbyR9KQ0gUtW0wOGd');
                }
            } catch (error) {
                console.log('No saved Mistral settings or initialization failed:', error);
            }

            // Initialize services sequentially to isolate failures
            console.log('Starting service initialization...');

            try {
                await VoiceService.initialize();
                console.log('VoiceService initialized');
            } catch (e) { console.error('VoiceService failed:', e); }

            try {
                await HapticService.initialize();
                console.log('HapticService initialized');
            } catch (e) { console.error('HapticService failed:', e); }

            try {
                await OCRService.initialize();
                console.log('OCRService initialized');
            } catch (e) { console.error('OCRService failed:', e); }

            try {
                await LLMService.initialize();
                console.log('LLMService initialized');
            } catch (e) { console.error('LLMService failed:', e); }

            try {
                await VisionService.initialize();
                console.log('VisionService initialized');
            } catch (e) {
                console.error('VisionService failed:', e);
                await VoiceService.speak('Vision service failed to load. Check internet for first run.', true);
            }

            // Welcome message
            const mistralStatus = MistralService.isAvailable() ? 'with Mistral enhanced mode' : '';
            await VoiceService.speak(`NeuroLens is ready ${mistralStatus}. Tap anywhere to describe your surroundings`, true);
            await HapticService.trigger('success');

            // Start continuous scene analysis
            startContinuousAnalysis();
        } catch (error) {
            console.error('Initialization failed:', error);
            await VoiceService.speak('Failed to initialize NeuroLens. Please restart the app', true);
        }
    };

    const startContinuousAnalysis = () => {
        // Analyze scene every 2 seconds for object detection
        processingInterval.current = setInterval(async () => {
            if (!isProcessing && currentMode === 'scene') {
                await analyzeCurrentFrame(false); // Silent analysis
            }
        }, 2000);
    };

    const analyzeCurrentFrame = async (speakResult: boolean = true) => {
        if (!cameraRef.current || isProcessing) return;

        setIsProcessing(true);

        try {
            // Capture frame with base64
            const photo = await cameraRef.current.takePictureAsync({
                quality: 0.5,
                base64: true,
                skipProcessing: true,
            });

            if (currentMode === 'scene') {
                // Analyze scene
                if (VisionService.isInitialized() && photo.base64) {
                    const sceneAnalysis = await VisionService.analyzeScene(photo.base64);

                    if (sceneAnalysis.objects.length > 0) {
                        await HapticService.trigger('object_detected');

                        if (speakResult) {
                            // Generate natural description using LLM
                            const description = await LLMService.generateSceneDescription(
                                sceneAnalysis.objects,
                                sceneAnalysis.sceneType,
                                sceneAnalysis.lightingCondition
                            );

                            await VoiceService.speak(description.text, true);
                        }
                    }
                } else {
                    console.warn('VisionService not initialized, falling back to Mistral');
                    // Fallback to Mistral Vision if available
                    const mistralStatus = MistralService.getStatus();
                    if (mistralStatus.enabled && mistralStatus.hasApiKey && cameraRef.current) {
                        try {
                            const photo = await cameraRef.current.takePictureAsync({
                                base64: true,
                                quality: 0.5,
                            });

                            if (photo && photo.base64) {
                                await HapticService.trigger('success');
                                const mistralResponse = await MistralService.analyzeImageWithVision(photo.base64);
                                await VoiceService.speak(mistralResponse.text, true);
                            }
                        } catch (mistralError) {
                            console.error('Mistral fallback failed:', mistralError);
                            await VoiceService.speak('Scene analysis failed. Please check your connection.', true);
                        }
                    } else {
                        await VoiceService.speak('Vision service unavailable. Please check settings.', true);
                    }
                }
            } else if (currentMode === 'text') {
                // OCR mode
                if (OCRService.isInitialized() && photo.base64) {
                    const ocrResult = await OCRService.detectText(photo.base64);

                    if (ocrResult.detections.length > 0) {
                        await HapticService.trigger('text_found');

                        if (speakResult) {
                            const organizedText = OCRService.organizeTextForReading(ocrResult.detections);
                            await VoiceService.speak(`Text found: ${organizedText}`, true);
                        }
                    } else if (speakResult) {
                        await VoiceService.speak('No text detected', true);
                    }
                } else {
                    console.warn('OCRService not initialized');
                }
            }
        } catch (error) {
            console.error('Frame analysis failed:', error);
            if (speakResult) {
                await VoiceService.speak('Analysis failed. Please try again', true);
                await HapticService.trigger('error');
            }
        } finally {
            setIsProcessing(false);
        }
    };

    const handleScreenTap = async () => {
        await HapticService.trigger('success');
        await analyzeCurrentFrame(true);
    };

    const switchMode = async (mode: 'scene' | 'text' | 'navigate') => {
        setCurrentMode(mode);
        await HapticService.trigger('success');

        const modeMessages = {
            scene: 'Scene description mode',
            text: 'Text reading mode',
            navigate: 'Navigation mode',
        };

        await VoiceService.speak(modeMessages[mode], true);
    };

    const cleanup = () => {
        if (processingInterval.current) {
            clearInterval(processingInterval.current);
        }
        VisionService.dispose();
        OCRService.dispose();
        LLMService.dispose();
    };

    if (!permission) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Loading...</Text>
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={styles.text}>Camera permission required. Please grant access.</Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <CameraView
                ref={cameraRef}
                style={styles.camera}
                facing="back"
            >
                <TouchableOpacity
                    style={styles.tapArea}
                    onPress={handleScreenTap}
                    accessibilityLabel="Tap to analyze scene"
                    accessibilityHint="Double tap to describe what's in front of you"
                >
                    <View style={styles.overlay}>
                        <Text style={styles.modeText}>{currentMode.toUpperCase()} MODE</Text>
                        {isProcessing && <Text style={styles.statusText}>Analyzing...</Text>}
                    </View>
                </TouchableOpacity>

                {/* Mode switcher buttons */}
                <View style={styles.modeButtons}>
                    <TouchableOpacity
                        style={[styles.modeButton, currentMode === 'scene' && styles.activeMode]}
                        onPress={() => switchMode('scene')}
                        accessibilityLabel="Scene mode"
                    >
                        <Text style={styles.buttonText}>👁️</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modeButton, currentMode === 'text' && styles.activeMode]}
                        onPress={() => switchMode('text')}
                        accessibilityLabel="Text reading mode"
                    >
                        <Text style={styles.buttonText}>📄</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.modeButton, currentMode === 'navigate' && styles.activeMode]}
                        onPress={() => switchMode('navigate')}
                        accessibilityLabel="Navigation mode"
                    >
                        <Text style={styles.buttonText}>🧭</Text>
                    </TouchableOpacity>
                </View>

                {/* Settings button */}
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => navigation.navigate('Settings')}
                    accessibilityLabel="Open settings"
                >
                    <Text style={styles.settingsButtonText}>⚙️</Text>
                </TouchableOpacity>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    camera: {
        flex: 1,
    },
    tapArea: {
        flex: 1,
    },
    overlay: {
        flex: 1,
        backgroundColor: 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#fff',
        textShadowColor: '#000',
        textShadowOffset: { width: 2, height: 2 },
        textShadowRadius: 4,
    },
    statusText: {
        fontSize: 18,
        color: '#fff',
        marginTop: 10,
        textShadowColor: '#000',
        textShadowOffset: { width: 1, height: 1 },
        textShadowRadius: 3,
    },
    modeButtons: {
        position: 'absolute',
        bottom: 50,
        flexDirection: 'row',
        justifyContent: 'space-around',
        width: '100%',
        paddingHorizontal: 40,
    },
    modeButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    activeMode: {
        backgroundColor: 'rgba(76, 175, 80, 0.8)',
        borderColor: '#4CAF50',
    },
    buttonText: {
        fontSize: 32,
    },
    settingsButton: {
        position: 'absolute',
        top: 50,
        right: 20,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#fff',
    },
    settingsButtonText: {
        fontSize: 28,
    },
    text: {
        fontSize: 18,
        color: '#fff',
        textAlign: 'center',
        padding: 20,
    },
    permissionButton: {
        backgroundColor: '#4CAF50',
        padding: 15,
        borderRadius: 10,
        margin: 20,
    },
    permissionButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});
