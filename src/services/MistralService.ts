/**
 * MistralService - Cloud-enhanced scene understanding
 * Uses Mistral API for richer descriptions when internet is available
 */

export interface MistralResponse {
    text: string;
    confidence: number;
    processingTime: number;
    source: 'mistral' | 'local';
}

class MistralService {
    private apiKey: string = 'TvkpxVoYWB8A2CVJbyR9KQ0gUtW0wOGd';
    private isEnabled = false;
    private baseUrl = 'https://api.mistral.ai/v1/chat/completions';

    /**
     * Initialize Mistral API
     * @param apiKey - Your Mistral API key
     */
    async initialize(apiKey: string): Promise<void> {
        try {
            this.apiKey = apiKey;
            console.log('Initializing Mistral with key:', apiKey.substring(0, 4) + '...');
            // Simple validation check
            if (this.apiKey && this.apiKey.length > 0) {
                this.isEnabled = true;
                console.log('Mistral Service initialized successfully');
            } else {
                throw new Error('Invalid API key');
            }
        } catch (error) {
            console.error('Failed to initialize Mistral Service:', error);
            this.isEnabled = false;
            throw new Error('Mistral Service initialization failed');
        }
    }

    /**
     * Check if Mistral is available and enabled
     */
    isAvailable(): boolean {
        return this.isEnabled;
    }

    /**
     * Generate enhanced scene description using Mistral
     */
    async generateEnhancedDescription(
        objects: Array<{ label: string; confidence: number; distance?: number }>,
        sceneType: string,
        lightingCondition: string,
        detectedText?: string
    ): Promise<MistralResponse> {
        const startTime = Date.now();

        if (!this.isAvailable()) {
            throw new Error('Mistral Service not available');
        }

        try {
            const prompt = this.buildEnhancedPrompt(objects, sceneType, lightingCondition, detectedText);

            const response = await this.makeRequest('mistral-small-latest', [
                { role: 'user', content: prompt }
            ]);

            const text = response.choices[0].message.content;

            return {
                text: text.trim(),
                confidence: 0.95,
                processingTime: Date.now() - startTime,
                source: 'mistral',
            };
        } catch (error) {
            console.error('Mistral API call failed:', error);
            throw error;
        }
    }

    /**
     * Generate navigation guidance using Mistral
     */
    async generateNavigationGuidance(
        targetObject: string,
        currentObjects: Array<{ label: string; distance?: number; confidence: number }>,
        userIntent: string
    ): Promise<MistralResponse> {
        const startTime = Date.now();

        if (!this.isAvailable()) {
            throw new Error('Mistral Service not available');
        }

        try {
            const prompt = `You are an AI assistant helping a visually impaired person navigate.

User's goal: ${userIntent}
Target object: ${targetObject}

Currently visible objects:
${currentObjects.map(o => `- ${o.label} at approximately ${o.distance?.toFixed(1) || 'unknown'} meters (${Math.round(o.confidence * 100)}% confident)`).join('\n')}

Provide clear, concise navigation instructions. Be specific about direction and distance. Keep it under 30 words.`;

            const response = await this.makeRequest('mistral-small-latest', [
                { role: 'user', content: prompt }
            ]);

            const text = response.choices[0].message.content;

            return {
                text: text.trim(),
                confidence: 0.90,
                processingTime: Date.now() - startTime,
                source: 'mistral',
            };
        } catch (error) {
            console.error('Mistral navigation guidance failed:', error);
            throw error;
        }
    }

    /**
     * Answer questions about the scene using Mistral
     */
    async answerQuestion(
        question: string,
        sceneContext: {
            objects: Array<{ label: string; distance?: number; confidence: number }>;
            text?: string;
            sceneType: string;
            lightingCondition: string;
        }
    ): Promise<MistralResponse> {
        const startTime = Date.now();

        if (!this.isAvailable()) {
            throw new Error('Mistral Service not available');
        }

        try {
            const prompt = `You are helping a visually impaired person understand their surroundings.

Scene information:
- Type: ${sceneContext.sceneType}
- Lighting: ${sceneContext.lightingCondition}
- Visible objects: ${sceneContext.objects.map(o => `${o.label} (${o.distance?.toFixed(1)}m away)`).join(', ')}
${sceneContext.text ? `- Visible text: "${sceneContext.text}"` : ''}

User's question: "${question}"

Provide a helpful, concise answer (under 40 words). Be specific and actionable.`;

            const response = await this.makeRequest('mistral-small-latest', [
                { role: 'user', content: prompt }
            ]);

            const text = response.choices[0].message.content;

            return {
                text: text.trim(),
                confidence: 0.92,
                processingTime: Date.now() - startTime,
                source: 'mistral',
            };
        } catch (error) {
            console.error('Mistral question answering failed:', error);
            throw error;
        }
    }

    /**
     * Analyze image directly with Mistral Vision (Pixtral)
     * This provides the most accurate descriptions
     */
    async analyzeImageWithVision(
        imageBase64: string,
        mimeType: string = 'image/jpeg'
    ): Promise<MistralResponse> {
        const startTime = Date.now();

        if (!this.isAvailable()) {
            throw new Error('Mistral Service not available');
        }

        try {
            const prompt = `You are assisting a visually impaired person. Analyze this image and provide:

1. A brief, natural description of the scene (2-3 sentences)
2. Important objects and their approximate locations (left, right, center, near, far)
3. Any text visible in the image
4. Potential hazards or obstacles
5. Helpful navigation cues

Keep your response conversational and under 100 words. Focus on what's most important for navigation and safety.`;

            const response = await this.makeRequest('pixtral-12b-2409', [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: prompt },
                        {
                            type: 'image_url',
                            image_url: {
                                url: `data:${mimeType};base64,${imageBase64}`
                            }
                        }
                    ]
                }
            ]);

            const text = response.choices[0].message.content;

            return {
                text: text.trim(),
                confidence: 0.98,
                processingTime: Date.now() - startTime,
                source: 'mistral',
            };
        } catch (error) {
            console.error('Mistral vision analysis failed:', error);
            throw error;
        }
    }

    /**
     * Build enhanced prompt for scene description
     */
    private buildEnhancedPrompt(
        objects: Array<{ label: string; confidence: number; distance?: number }>,
        sceneType: string,
        lightingCondition: string,
        detectedText?: string
    ): string {
        return `You are an AI assistant helping a visually impaired person understand their surroundings.

Scene Analysis:
- Location type: ${sceneType}
- Lighting: ${lightingCondition}
- Detected objects: ${objects.map(o => `${o.label} (${o.distance?.toFixed(1) || '?'}m away, ${Math.round(o.confidence * 100)}% confident)`).join(', ')}
${detectedText ? `- Visible text: "${detectedText}"` : ''}

Provide a natural, conversational description of this scene in 2-3 sentences. Focus on:
1. Overall environment and atmosphere
2. Key objects and their spatial relationships
3. Any important details for navigation or safety

Be concise, helpful, and conversational. Speak directly to the user.`;
    }

    /**
     * Helper to make API requests
     */
    private async makeRequest(model: string, messages: any[]): Promise<any> {
        const response = await fetch(this.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: model,
                messages: messages,
                temperature: 0.7,
                max_tokens: 500
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Mistral API error: ${response.status} ${response.statusText} - ${errorText}`);
        }

        return await response.json();
    }

    /**
     * Enable/disable Mistral service
     */
    setEnabled(enabled: boolean): void {
        this.isEnabled = enabled && this.apiKey.length > 0;
    }

    /**
     * Get current status
     */
    getStatus(): { enabled: boolean; hasApiKey: boolean } {
        return {
            enabled: this.isEnabled,
            hasApiKey: this.apiKey.length > 0,
        };
    }

    /**
     * Cleanup
     */
    dispose(): void {
        this.isEnabled = false;
    }
}

export default new MistralService();
