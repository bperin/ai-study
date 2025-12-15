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
            const { InMemoryRunner, LlmAgent } = require('@google/adk');
            const { InMemorySessionService } = require('@google/adk');

            // Initialize session service with Custom implementation
            this.sessionService = new CustomSessionService();

            // Create a dummy agent for testing
            const testAgent = new LlmAgent({
                name: 'test_agent',
                description: 'test',
                model: 'gemini-2.5-flash',
                instruction: 'test'
            });

            // Create a test runner to verify ADK works
            const testRunner = new InMemoryRunner({
                agent: testAgent,
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

            // Create a fresh session service for this request (stateless/isolated per call)
            const localSessionService = new CustomSessionService();
            const sessionId = `session-${userId}-${Date.now()}`;

            // Create session in our custom service
            await localSessionService.createSession({
                appName,
                userId,
                sessionId,
            });

            const runner = new InMemoryRunner({
                agent,
                appName,
                sessionService: localSessionService,
            });

            this.logger.debug(`Running agent for user ${userId} in session ${sessionId}`);

            const userMessage = {
                role: 'user',
                parts: [{ text: message }],
            };

            const stream = await runner.runAsync({
                userId,
                sessionId,
                newMessage: userMessage,
            });

            let responseText = '';
            for await (const event of stream) {
                // Capture model response
                const content = (event as any).content;
                if (content && content.role === 'model' && content.parts?.length > 0) {
                    responseText = content.parts.map((p: any) => p.text).join('');
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

/**
 * Custom Simple Session Service to bypass library issues
 */
class CustomSessionService {
    private sessions = new Map<string, any>();

    async createSession(options: any) {
        const id = options.sessionId || `session-${Date.now()}`;
        const session = {
            id: id,
            appName: options.appName,
            userId: options.userId,
            state: options.state || {},
            history: []
        };
        this.sessions.set(id, session);
        console.log(`[CustomSession] Created session ${id}`);
        return session;
    }

    async getSession(arg1: any, arg2?: any, arg3?: any) {
        // Handle different signatures: (sessionId) or (app, user, sessionId)
        let sessionId = null;

        if (typeof arg1 === 'string' && !arg2) {
            sessionId = arg1;
        } else if (typeof arg3 === 'string') {
            sessionId = arg3;
        } else if (typeof arg1 === 'object' && arg1.sessionId) {
            sessionId = arg1.sessionId;
        }

        if (sessionId && this.sessions.has(sessionId)) {
            return this.sessions.get(sessionId);
        }

        // Try finding by ID directly if arg1 matches a key
        if (typeof arg1 === 'string' && this.sessions.has(arg1)) {
            return this.sessions.get(arg1);
        }

        console.warn(`[CustomSession] Session not found. Lookup args:`, arg1, arg2, arg3);
        return null;
    }

    async updateSession(session: any) {
        if (session && session.id) {
            this.sessions.set(session.id, session);
        }
    }

    async appendEvent(session: any, event: any) {
        // Ensure session object is up to date
        const currentSession = this.sessions.get(session.id) || session;
        if (!currentSession.history) currentSession.history = [];
        currentSession.history.push(event);
        this.sessions.set(currentSession.id, currentSession);
    }

    async saveSession(session: any) {
        if (session && session.id) {
            this.sessions.set(session.id, session);
        }
    }
}
