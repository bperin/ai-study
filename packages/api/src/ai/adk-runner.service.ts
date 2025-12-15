import { Injectable, OnModuleInit, Logger } from '@nestjs/common';

@Injectable()
export class AdkRunnerService implements OnModuleInit {
    private readonly logger = new Logger(AdkRunnerService.name);
    private runner: any = null;
    private sessionService: any = null;
    private isAdkAvailable = false;

    async onModuleInit() {
        await this.initializeAdkRunner();
    }

    private async initializeAdkRunner() {
        try {
            // Test ADK availability
            const { InMemoryRunner } = require('@google/adk');
            const { InMemorySessionService } = require('@google/adk');
            
            // Initialize session service
            this.sessionService = new InMemorySessionService();
            
            // Create a test runner to verify ADK works
            const testRunner = new InMemoryRunner({
                agent: null,
                appName: 'ai-study-test',
                sessionService: this.sessionService,
            });
            
            this.isAdkAvailable = true;
            this.logger.log('✅ ADK Runner Service initialized successfully');
            
        } catch (error) {
            this.isAdkAvailable = false;
            this.logger.warn('❌ ADK not available - services will use Gemini fallback', (error as Error).message);
        }
    }

    /**
     * Check if ADK is available for use
     */
    isAvailable(): boolean {
        return this.isAdkAvailable;
    }

    /**
     * Run an agent with proper session management
     */
    async runAgent(
        agent: any,
        userId: string,
        message: string,
        appName: string = 'ai-study'
    ): Promise<string> {
        if (!this.isAdkAvailable) {
            throw new Error('ADK not available');
        }

        try {
            const { InMemoryRunner } = require('@google/adk');
            
            // Create runner for this specific agent
            const runner = new InMemoryRunner({
                agent,
                appName,
                sessionService: this.sessionService,
            });

            // Create or get session for this user
            const session = await this.sessionService.createSession({
                appName,
                userId,
            });

            this.logger.debug(`Running agent for user ${userId} in session ${session.id}`);

            // Create user message
            const userMessage = {
                role: 'user',
                parts: [{ text: message }],
            };

            // Run agent and collect response
            let responseText = '';
            
            for await (const event of runner.runAsync({
                userId,
                sessionId: session.id,
                newMessage: userMessage,
            })) {
                // Process events and get final response
                if (event.content && event.content.parts && event.content.parts.length > 0) {
                    responseText = event.content.parts[0].text;
                }
            }

            this.logger.debug(`Agent response for user ${userId}: ${responseText.substring(0, 100)}...`);
            return responseText;

        } catch (error) {
            this.logger.error(`Error running agent for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Run an agent for question generation with tools
     */
    async runQuestionGenerationAgent(
        agent: any,
        prompt: string,
        sessionId: string = `generation-${Date.now()}`,
        appName: string = 'flashcard-generator'
    ): Promise<void> {
        if (!this.isAdkAvailable) {
            throw new Error('ADK not available');
        }

        try {
            const { InMemoryRunner } = require('@google/adk');
            
            // Create runner for question generation
            const runner = new InMemoryRunner({
                agent,
                appName,
                sessionService: this.sessionService,
            });

            const userId = 'system';

            // Create session for generation
            await this.sessionService.createSession({
                appName,
                userId,
                sessionId,
                state: { type: 'question_generation' },
            });

            this.logger.debug(`Running question generation agent in session ${sessionId}`);

            // Create user message
            const userMessage = {
                role: 'user',
                parts: [{ text: prompt }],
            };

            // Run agent - tools will be executed automatically
            for await (const event of runner.runAsync({
                userId,
                sessionId,
                newMessage: userMessage,
            })) {
                // Tools are executed automatically by the runner
                // We just need to let it complete
            }

            this.logger.debug(`Question generation completed for session ${sessionId}`);

        } catch (error) {
            this.logger.error(`Error running question generation agent:`, error);
            throw error;
        }
    }

    /**
     * Get session service for direct access if needed
     */
    getSessionService(): any {
        return this.sessionService;
    }

    /**
     * Clean up old sessions (optional maintenance method)
     */
    async cleanupOldSessions(olderThanHours: number = 24): Promise<void> {
        if (!this.sessionService) return;

        try {
            // Implementation would depend on session service capabilities
            this.logger.debug(`Cleaning up sessions older than ${olderThanHours} hours`);
            // Add cleanup logic here if session service supports it
        } catch (error) {
            this.logger.error('Error cleaning up old sessions:', error);
        }
    }
}
