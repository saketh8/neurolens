/**
 * LLMService - Hybrid Language Model Service
 * Uses Mistral API for cognitive tasks and local templates for reflex responses
 */

import MistralService from './MistralService';

export interface LLMResponse {
    text: string;
    confidence: number;
    processingTime: number;
    source?: 'mistral' | 'local' | 'template';
}

class LLMService {
    private isInitialized = false;

    /**
     * Initialize the LLM Service
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) return;

        try {
            console.log('Initializing LLM Service...');
            this.isInitialized = true;
            console.log('LLM Service initialized successfully');
        } catch (error) {
            console.error('Failed to initialize LLM Service:', error);
            throw new Error('LLM Service initialization failed');
        }
    }

    /**
     * Generate scene description from vision data
     * Uses Mistral API when available, falls back to local templates
     */
    async generateSceneDescription(
        objects: Array<{ label: string; confidence: number; distance?: number }>,
        sceneType: string,
        lightingCondition: string,
        detectedText?: string
    ): Promise<LLMResponse> {
        const startTime = Date.now();

        try {
            // Try Mistral first if available (Cognitive Layer)
            if (MistralService.isAvailable()) {
                try {
                    return await MistralService.generateEnhancedDescription(
                        objects,
                        sceneType,
                        lightingCondition,
                        detectedText
                    );
                } catch (mistralError) {
                    console.warn('Mistral API failed, falling back to local:', mistralError);
                }
            }

            // Fallback to local template (Reflex Layer)
            const description = this.generateTemplateDescription(objects, sceneType, lightingCondition);

            return {
                text: description,
                confidence: 0.85,
                processingTime: Date.now() - startTime,
                source: 'template',
            };
        } catch (error) {
            console.error('Scene description generation failed:', error);
            throw error;
        }
    }

    /**
     * Generate navigation instructions
     * Uses Mistral API when available, falls back to local processing
     */
    async generateNavigationGuidance(
        targetObject: string,
        currentObjects: Array<{ label: string; distance?: number; confidence: number }>,
        userIntent: string
    ): Promise<LLMResponse> {
        const startTime = Date.now();

        try {
            // Try Mistral first if available
            if (MistralService.isAvailable()) {
                try {
                    return await MistralService.generateNavigationGuidance(
                        targetObject,
                        currentObjects,
                        userIntent
                    );
                } catch (mistralError) {
                    console.warn('Mistral navigation failed, falling back to local:', mistralError);
                }
            }

            // Fallback to template
            const guidance = this.generateTemplateNavigation(targetObject, currentObjects);

            return {
                text: guidance,
                confidence: 0.80,
                processingTime: Date.now() - startTime,
                source: 'template',
            };
        } catch (error) {
            console.error('Navigation guidance generation failed:', error);
            throw error;
        }
    }

    /**
     * Answer user questions about the scene
     * Uses Mistral API when available, falls back to local processing
     */
    async answerQuestion(
        question: string,
        sceneContext: {
            objects: Array<{ label: string; distance?: number; confidence: number }>;
            text?: string;
            sceneType: string;
            lightingCondition: string;
        }
    ): Promise<LLMResponse> {
        const startTime = Date.now();

        try {
            // Try Mistral first if available
            if (MistralService.isAvailable()) {
                try {
                    return await MistralService.answerQuestion(question, sceneContext);
                } catch (mistralError) {
                    console.warn('Mistral Q&A failed, falling back to local:', mistralError);
                }
            }

            // Fallback to template
            const answer = this.generateTemplateAnswer(question, sceneContext);

            return {
                text: answer,
                confidence: 0.75,
                processingTime: Date.now() - startTime,
                source: 'template',
            };
        } catch (error) {
            console.error('Question answering failed:', error);
            throw error;
        }
    }

    /**
     * Build prompt for scene description
     */
    private buildScenePrompt(
        objects: Array<{ label: string; confidence: number; distance?: number }>,
        sceneType: string,
        lightingCondition: string
    ): string {
        return `Describe this scene naturally for a visually impaired person:
    Location: ${sceneType}
    Lighting: ${lightingCondition}
    Objects detected: ${objects.map(o => `${o.label} (${o.distance}m away)`).join(', ')}
    Keep it concise and helpful.`;
    }

    /**
     * Template-based description (fallback when LLM not available)
     */
    private generateTemplateDescription(
        objects: Array<{ label: string; distance?: number }>,
        sceneType: string,
        lightingCondition: string
    ): string {
        if (objects.length === 0) {
            return `You appear to be in a ${sceneType} area with ${lightingCondition} lighting. No specific objects detected nearby.`;
        }

        const closeObjects = objects.filter(o => (o.distance || 10) < 2);
        const farObjects = objects.filter(o => (o.distance || 10) >= 2);

        let description = `You're in a ${sceneType} area with ${lightingCondition} lighting. `;

        if (closeObjects.length > 0) {
            description += `Close to you: ${closeObjects.map(o => o.label).join(', ')}. `;
        }

        if (farObjects.length > 0) {
            description += `Further away: ${farObjects.map(o => o.label).join(', ')}.`;
        }

        return description;
    }

    /**
     * Template-based navigation (fallback)
     */
    private generateTemplateNavigation(
        targetObject: string,
        currentObjects: Array<{ label: string; distance?: number }>
    ): string {
        const target = currentObjects.find(o =>
            o.label.toLowerCase().includes(targetObject.toLowerCase())
        );

        if (target) {
            const distance = target.distance || 5;
            return `${targetObject} is approximately ${Math.round(distance)} meters ahead of you.`;
        }

        return `I don't see a ${targetObject} in the current view. Try looking around.`;
    }

    /**
     * Template-based question answering (fallback)
     */
    private generateTemplateAnswer(
        question: string,
        sceneContext: any
    ): string {
        const lowerQuestion = question.toLowerCase();

        if (lowerQuestion.includes('what') || lowerQuestion.includes('see')) {
            return `I can see ${sceneContext.objects.map((o: any) => o.label).join(', ')} in this ${sceneContext.sceneType}.`;
        }

        if (lowerQuestion.includes('where')) {
            return `You're in a ${sceneContext.sceneType} area.`;
        }

        if (lowerQuestion.includes('how many')) {
            return `I can see ${sceneContext.objects.length} objects.`;
        }

        return `I see ${sceneContext.objects.length} objects in this ${sceneContext.sceneType}.`;
    }

    /**
     * Cleanup resources
     */
    dispose(): void {
        this.isInitialized = false;
    }
}

export default new LLMService();
