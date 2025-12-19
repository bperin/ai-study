import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { createAdkRunner, createAdkSession, isAdkAvailable } from './adk.helpers';

@Injectable()
export class AdkRunnerService implements OnModuleInit {
    private readonly logger = new Logger(AdkRunnerService.name);
    private sessionService: any = null;
    private isAdkAvailable = false;

    async onModuleInit() {
        await this.initializeAdkRunner();
    }

    private async initializeAdkRunner() {
        try {
            this.logger.log('[ADK] Starting initialization...');
            
            const available = isAdkAvailable();
            this.logger.log(`[ADK] Availability check: ${available}`);
            
            if (!available) {
                this.isAdkAvailable = false;
                this.logger.warn('[ADK] ❌ ADK not available - services will use Gemini fallback');
                return;
            }

            this.logger.log('[ADK] Loading LlmAgent from @google/adk...');
            const { LlmAgent } = require('@google/adk');
            this.logger.log('[ADK] ✓ LlmAgent loaded successfully');
            
            this.logger.log('[ADK] Creating CustomSessionService...');
            this.sessionService = new CustomSessionService();
            this.logger.log('[ADK] ✓ CustomSessionService created');

            this.logger.log('[ADK] Creating test agent...');
            const testAgent = new LlmAgent({
                name: 'test_agent',
                description: 'test',
                model: 'gemini-2.5-flash',
                instruction: 'test'
            });
            this.logger.log(`[ADK] ✓ Test agent created: ${testAgent.name}`);

            this.logger.log('[ADK] Creating test runner...');
            const testRunner = createAdkRunner({
                agent: testAgent,
                appName: 'ai-study-test',
                sessionService: this.sessionService,
            });
            this.logger.log(`[ADK] Test runner created: ${!!testRunner}`);

            if (!testRunner) {
                this.isAdkAvailable = false;
                this.logger.error('[ADK] ❌ Runner creation returned null');
                this.logger.warn('[ADK] Services will use Gemini fallback');
                return;
            }

            this.logger.log('[ADK] Testing runner execution...');
            try {
                const testSession = await createAdkSession(testRunner, {
                    appName: 'ai-study-test',
                    userId: 'test-user',
                    sessionId: 'test-session',
                });
                this.logger.log(`[ADK] ✓ Test session created: ${!!testSession}`);
            } catch (execError) {
                this.logger.error('[ADK] ❌ Test execution failed:', execError);
                this.logger.error('[ADK] Error stack:', (execError as Error).stack);
                throw execError;
            }

            this.isAdkAvailable = true;
            this.logger.log('[ADK] ✅ ADK Runner Service initialized successfully');

        } catch (error) {
            this.isAdkAvailable = false;
            this.logger.error('[ADK] ❌ Initialization failed:', (error as Error).message);
            this.logger.error('[ADK] Error stack:', (error as Error).stack);
            this.logger.warn('[ADK] Services will use Gemini fallback');
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
            const localSessionService = new CustomSessionService();
            const sessionId = `session-${userId}-${Date.now()}`;

            const runner = createAdkRunner({
                agent,
                appName,
                sessionService: localSessionService,
            });
            if (!runner) {
                throw new Error('Failed to create ADK runner');
            }

            await createAdkSession(runner, {
                appName,
                userId,
                sessionId,
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
            const runner = createAdkRunner({ agent, appName, sessionService: this.sessionService });
            if (!runner) {
                throw new Error('Failed to create ADK runner');
            }

            const userId = 'system';

            // Create session for generation
            await createAdkSession(runner, {
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
        console.log(`[CustomSession] getSession called with args:`, { arg1: typeof arg1, arg2: typeof arg2, arg3: typeof arg3 });
        
        let sessionId: string | null = null;

        // Signature 1: (sessionId)
        if (typeof arg1 === 'string' && !arg2 && !arg3) {
            sessionId = arg1;
        }
        // Signature 2: (appName, userId, sessionId)
        else if (typeof arg1 === 'string' && typeof arg2 === 'string' && typeof arg3 === 'string') {
            sessionId = arg3;
        }
        // Signature 3: ({ sessionId, ... })
        else if (typeof arg1 === 'object' && arg1 !== null && arg1.sessionId) {
            sessionId = arg1.sessionId;
        }
        // Signature 4: Direct session object passed
        else if (typeof arg1 === 'object' && arg1 !== null && arg1.id) {
            sessionId = arg1.id;
        }

        if (!sessionId) {
            console.error('[CustomSession] Could not extract sessionId from arguments');
            console.error('[CustomSession] Available sessions:', Array.from(this.sessions.keys()));
            return null;
        }

        const session = this.sessions.get(sessionId);
        if (!session) {
            console.warn(`[CustomSession] Session not found: ${sessionId}`);
            console.warn('[CustomSession] Available sessions:', Array.from(this.sessions.keys()));
        } else {
            console.log(`[CustomSession] Session found: ${sessionId}`);
        }
        
        return session || null;
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

    async loadSession(sessionId: string) {
        console.error(`[CustomSession] loadSession called with:`, sessionId);
        return this.getSession(sessionId);
    }
}
