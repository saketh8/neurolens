/**
 * HapticService - Haptic feedback for accessibility
 * Provides tactile feedback for different events
 */

import * as Haptics from 'expo-haptics';

export type HapticPattern =
    | 'object_detected'
    | 'text_found'
    | 'navigation_cue'
    | 'warning'
    | 'success'
    | 'error';

class HapticService {
    private isEnabled = true;

    /**
     * Initialize haptic service
     */
    async initialize(): Promise<void> {
        console.log('Haptic Service initialized');
    }

    /**
     * Trigger haptic feedback based on pattern
     */
    async trigger(pattern: HapticPattern): Promise<void> {
        if (!this.isEnabled) return;

        try {
            switch (pattern) {
                case 'object_detected':
                    // Single light impact
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;

                case 'text_found':
                    // Double light impact
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await this.delay(100);
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;

                case 'navigation_cue':
                    // Medium impact
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    break;

                case 'warning':
                    // Triple medium impact
                    for (let i = 0; i < 3; i++) {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        await this.delay(150);
                    }
                    break;

                case 'success':
                    // Success notification
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    break;

                case 'error':
                    // Error notification
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    break;
            }
        } catch (error) {
            console.error('Haptic feedback failed:', error);
        }
    }

    /**
     * Provide directional haptic cue
     * @param direction - 'left', 'right', 'forward', 'back'
     */
    async directionalCue(direction: 'left' | 'right' | 'forward' | 'back'): Promise<void> {
        if (!this.isEnabled) return;

        // Different patterns for different directions
        switch (direction) {
            case 'left':
                // Two quick pulses
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                await this.delay(50);
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                break;

            case 'right':
                // Three quick pulses
                for (let i = 0; i < 3; i++) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    await this.delay(50);
                }
                break;

            case 'forward':
                // Single strong pulse
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                break;

            case 'back':
                // Long vibration
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                await this.delay(200);
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                break;
        }
    }

    /**
     * Provide distance feedback (closer = more frequent pulses)
     */
    async distanceFeedback(distanceMeters: number): Promise<void> {
        if (!this.isEnabled) return;

        // Closer objects = faster pulses
        const interval = Math.max(100, Math.min(1000, distanceMeters * 200));

        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        await this.delay(interval);
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }

    /**
     * Enable/disable haptic feedback
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled;
    }

    /**
     * Check if haptics are enabled
     */
    isHapticsEnabled(): boolean {
        return this.isEnabled;
    }

    /**
     * Helper delay function
     */
    private delay(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

export default new HapticService();
