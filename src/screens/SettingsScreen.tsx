/**
 * SettingsScreen - Configure NeuroLens settings
 * Including Gemini API key for enhanced descriptions
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    StyleSheet,
    TouchableOpacity,
    Switch,
    ScrollView,
    Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MistralService from '../services/MistralService';
import VoiceService from '../services/VoiceService';

const STORAGE_KEYS = {
    MISTRAL_API_KEY: '@neurolens_mistral_key',
    MISTRAL_ENABLED: '@neurolens_mistral_enabled',
    VOICE_RATE: '@neurolens_voice_rate',
    VOICE_PITCH: '@neurolens_voice_pitch',
};

export default function SettingsScreen() {
    const [apiKey, setApiKey] = useState('');
    const [mistralEnabled, setMistralEnabled] = useState(false);
    const [voiceRate, setVoiceRate] = useState(1.0);
    const [voicePitch, setVoicePitch] = useState(1.0);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadSettings();
    }, []);

    const loadSettings = async () => {
        try {
            const savedApiKey = await AsyncStorage.getItem(STORAGE_KEYS.MISTRAL_API_KEY);
            const savedEnabled = await AsyncStorage.getItem(STORAGE_KEYS.MISTRAL_ENABLED);
            const savedRate = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_RATE);
            const savedPitch = await AsyncStorage.getItem(STORAGE_KEYS.VOICE_PITCH);

            if (savedApiKey) setApiKey(savedApiKey);
            if (savedEnabled) setMistralEnabled(savedEnabled === 'true');
            if (savedRate) setVoiceRate(parseFloat(savedRate));
            if (savedPitch) setVoicePitch(parseFloat(savedPitch));
        } catch (error) {
            console.error('Failed to load settings:', error);
        }
    };

    const saveSettings = async () => {
        setIsSaving(true);
        try {
            // Save API key
            await AsyncStorage.setItem(STORAGE_KEYS.MISTRAL_API_KEY, apiKey);
            await AsyncStorage.setItem(STORAGE_KEYS.MISTRAL_ENABLED, mistralEnabled.toString());
            await AsyncStorage.setItem(STORAGE_KEYS.VOICE_RATE, voiceRate.toString());
            await AsyncStorage.setItem(STORAGE_KEYS.VOICE_PITCH, voicePitch.toString());

            // Initialize Mistral if enabled and key provided
            if (mistralEnabled && apiKey.trim()) {
                try {
                    await MistralService.initialize(apiKey.trim());
                    await VoiceService.speak('Mistral enhanced mode enabled', true);
                } catch (error) {
                    Alert.alert('Error', 'Failed to initialize Mistral API. Please check your API key.');
                    setMistralEnabled(false);
                }
            } else {
                MistralService.setEnabled(false);
            }

            // Update voice settings
            VoiceService.updateSettings({
                rate: voiceRate,
                pitch: voicePitch,
                language: 'en-US',
                volume: 1.0,
            });

            await VoiceService.speak('Settings saved successfully', true);
        } catch (error) {
            console.error('Failed to save settings:', error);
            Alert.alert('Error', 'Failed to save settings');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🤖 Mistral AI Enhancement</Text>
                <Text style={styles.description}>
                    Enable Mistral API for richer, more detailed scene descriptions. Requires internet connection.
                </Text>

                <View style={styles.switchRow}>
                    <Text style={styles.label}>Enable Mistral</Text>
                    <Switch
                        value={mistralEnabled}
                        onValueChange={setMistralEnabled}
                        accessibilityLabel="Enable Mistral enhanced mode"
                    />
                </View>

                {mistralEnabled && (
                    <View style={styles.inputContainer}>
                        <Text style={styles.label}>Mistral API Key</Text>
                        <TextInput
                            style={styles.input}
                            value={apiKey}
                            onChangeText={setApiKey}
                            placeholder="Enter your Mistral API key"
                            placeholderTextColor="#666"
                            secureTextEntry
                            autoCapitalize="none"
                            autoCorrect={false}
                            accessibilityLabel="Mistral API key input"
                        />
                        <Text style={styles.hint}>
                            Get your API key at: console.mistral.ai
                        </Text>
                    </View>
                )}
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>🔊 Voice Settings</Text>

                <View style={styles.sliderContainer}>
                    <Text style={styles.label}>Speech Rate: {voiceRate.toFixed(1)}x</Text>
                    <View style={styles.sliderButtons}>
                        <TouchableOpacity
                            style={styles.sliderButton}
                            onPress={() => setVoiceRate(Math.max(0.5, voiceRate - 0.1))}
                            accessibilityLabel="Decrease speech rate"
                        >
                            <Text style={styles.buttonText}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sliderButton}
                            onPress={() => setVoiceRate(Math.min(2.0, voiceRate + 0.1))}
                            accessibilityLabel="Increase speech rate"
                        >
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sliderContainer}>
                    <Text style={styles.label}>Voice Pitch: {voicePitch.toFixed(1)}x</Text>
                    <View style={styles.sliderButtons}>
                        <TouchableOpacity
                            style={styles.sliderButton}
                            onPress={() => setVoicePitch(Math.max(0.5, voicePitch - 0.1))}
                            accessibilityLabel="Decrease voice pitch"
                        >
                            <Text style={styles.buttonText}>−</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.sliderButton}
                            onPress={() => setVoicePitch(Math.min(2.0, voicePitch + 0.1))}
                            accessibilityLabel="Increase voice pitch"
                        >
                            <Text style={styles.buttonText}>+</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            <TouchableOpacity
                style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                onPress={saveSettings}
                disabled={isSaving}
                accessibilityLabel="Save settings"
            >
                <Text style={styles.saveButtonText}>
                    {isSaving ? 'Saving...' : 'Save Settings'}
                </Text>
            </TouchableOpacity>

            <View style={styles.infoSection}>
                <Text style={styles.infoTitle}>ℹ️ About Enhanced Mode</Text>
                <Text style={styles.infoText}>
                    • <Text style={styles.bold}>On-Device (Default)</Text>: All processing happens locally. Works offline. Complete privacy.
                </Text>
                <Text style={styles.infoText}>
                    • <Text style={styles.bold}>Mistral Enhanced</Text>: Uses Mistral AI for richer descriptions. Requires internet. More detailed and contextual.
                </Text>
                <Text style={styles.infoText}>
                    • Mistral automatically falls back to on-device processing if offline.
                </Text>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#1a1a2e',
    },
    section: {
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    description: {
        fontSize: 14,
        color: '#aaa',
        marginBottom: 15,
        lineHeight: 20,
    },
    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    label: {
        fontSize: 16,
        color: '#fff',
        marginBottom: 8,
    },
    inputContainer: {
        marginTop: 10,
    },
    input: {
        backgroundColor: '#2a2a3e',
        borderRadius: 8,
        padding: 15,
        fontSize: 16,
        color: '#fff',
        borderWidth: 1,
        borderColor: '#444',
    },
    hint: {
        fontSize: 12,
        color: '#888',
        marginTop: 5,
    },
    sliderContainer: {
        marginBottom: 20,
    },
    sliderButtons: {
        flexDirection: 'row',
        gap: 10,
    },
    sliderButton: {
        backgroundColor: '#4CAF50',
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonText: {
        fontSize: 24,
        color: '#fff',
        fontWeight: 'bold',
    },
    saveButton: {
        backgroundColor: '#4CAF50',
        margin: 20,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    saveButtonDisabled: {
        backgroundColor: '#666',
    },
    saveButtonText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#fff',
    },
    infoSection: {
        padding: 20,
        backgroundColor: '#2a2a3e',
        margin: 20,
        borderRadius: 12,
    },
    infoTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#fff',
        marginBottom: 10,
    },
    infoText: {
        fontSize: 14,
        color: '#ccc',
        marginBottom: 8,
        lineHeight: 20,
    },
    bold: {
        fontWeight: 'bold',
        color: '#fff',
    },
});
