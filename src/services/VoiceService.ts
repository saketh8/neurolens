/**
 * VoiceService - Text-to-Speech and Speech-to-Text
 * Provides voice interface for accessibility
 */

import * as Speech from 'expo-speech';

export interface VoiceSettings {
    rate: number; // 0.5 to 2.0
    pitch: number; // 0.5 to 2.0
    language: string;
    volume: number; // 0.0 to 1.0
}

export type VoiceCommand =
    | 'describe_scene'
    | 'read_text'
    | 'find_object'
    | 'navigate'
    | 'help'
    | 'settings'
    | 'unknown';

class VoiceService {
    private settings: VoiceSettings = {
        rate: 1.0,
        pitch: 1.0,
        language: 'en-US',
        volume: 1.0,
    };

    private isSpeaking = false;
    private speechQueue: string[] = [];

    /**
     * Initialize voice service
     */
    async initialize(): Promise<void> {
        console.log('Voice Service initialized');

        // Check if speech is available
        const voices = await Speech.getAvailableVoicesAsync();
        console.log(`Available voices: ${voices.length}`);
    }

    /**
     * Speak text using TTS
     * @param text - Text to speak
     * @param priority - If true, interrupts current speech
     */
    async speak(text: string, priority: boolean = false): Promise<void> {
        if (priority) {
            // Stop current speech and clear queue
            await this.stop();
            this.speechQueue = [];
        }

        if (this.isSpeaking && !priority) {
            // Add to queue
            this.speechQueue.push(text);
            return;
        }

        this.isSpeaking = true;

        try {
            await Speech.speak(text, {
                language: this.settings.language,
                pitch: this.settings.pitch,
                rate: this.settings.rate,
                volume: this.settings.volume,
                onDone: () => {
                    this.isSpeaking = false;
                    this.processQueue();
                },
                onError: (error) => {
                    console.error('Speech error:', error);
                    this.isSpeaking = false;
                    this.processQueue();
                },
            });
        } catch (error) {
            console.error('Failed to speak:', error);
            this.isSpeaking = false;
        }
    }

    /**
     * Process queued speech
     */
    private async processQueue(): Promise<void> {
        if (this.speechQueue.length > 0) {
            const nextText = this.speechQueue.shift();
            if (nextText) {
                await this.speak(nextText);
            }
        }
    }

    /**
     * Stop current speech
     */
    async stop(): Promise<void> {
        await Speech.stop();
        this.isSpeaking = false;
    }

    /**
     * Update voice settings
     */
    updateSettings(newSettings: Partial<VoiceSettings>): void {
        this.settings = { ...this.settings, ...newSettings };
    }

    /**
     * Get current settings
     */
    getSettings(): VoiceSettings {
        return { ...this.settings };
    }

    /**
     * Parse voice command from text
     * In production, use more sophisticated NLP
     */
    parseCommand(text: string): VoiceCommand {
        const lowerText = text.toLowerCase();

        if (lowerText.includes('describe') || lowerText.includes('what') || lowerText.includes('see')) {
            return 'describe_scene';
        }
        if (lowerText.includes('read') || lowerText.includes('text')) {
            return 'read_text';
        }
        if (lowerText.includes('find') || lowerText.includes('where')) {
            return 'find_object';
        }
        if (lowerText.includes('navigate') || lowerText.includes('direction')) {
            return 'navigate';
        }
        if (lowerText.includes('help')) {
            return 'help';
        }
        if (lowerText.includes('settings') || lowerText.includes('options')) {
            return 'settings';
        }

        return 'unknown';
    }

    /**
     * Provide audio feedback for different events
     */
    async provideFeedback(event: 'object_detected' | 'text_found' | 'error' | 'success'): Promise<void> {
        const feedbackSounds: Record<string, string> = {
            object_detected: 'Object detected',
            text_found: 'Text found',
            error: 'Error occurred',
            success: 'Success',
        };

        // In production, use actual sound effects
        // For now, use brief TTS
        await this.speak(feedbackSounds[event], false);
    }

    /**
     * Generate natural scene description
     */
    generateSceneDescription(objects: Array<{ label: string; distance?: number }>): string {
        if (objects.length === 0) {
            return 'No objects detected in view';
        }

        const descriptions: string[] = [];

        // Group objects by distance
        const closeObjects = objects.filter(obj => (obj.distance || 10) < 2);
        const mediumObjects = objects.filter(obj => (obj.distance || 10) >= 2 && (obj.distance || 10) < 5);
        const farObjects = objects.filter(obj => (obj.distance || 10) >= 5);

        if (closeObjects.length > 0) {
            const labels = closeObjects.map(obj => obj.label).join(', ');
            descriptions.push(`Close to you: ${labels}`);
        }

        if (mediumObjects.length > 0) {
            const labels = mediumObjects.map(obj => obj.label).join(', ');
            descriptions.push(`A few meters away: ${labels}`);
        }

        if (farObjects.length > 0) {
            const labels = farObjects.map(obj => obj.label).join(', ');
            descriptions.push(`In the distance: ${labels}`);
        }

        return descriptions.join('. ');
    }

    /**
     * Announce navigation cue
     */
    async announceNavigation(direction: string, object: string, distance: number): Promise<void> {
        const distanceText = distance < 1
            ? 'very close'
            : distance < 3
                ? `${Math.round(distance)} meters`
                : 'far ahead';

        await this.speak(`${object} ${distanceText}, ${direction}`, true);
    }
}

export default new VoiceService();
