// Centralized utilities for working with ADK to avoid scattered try/catch blocks
// and duplicated session creation logic across services.

interface AdkRuntime {
  InMemoryRunner: any;
  LlmAgent: any;
}

let cachedRuntime: AdkRuntime | null | undefined;

function loadAdkRuntime(): AdkRuntime | null {
  if (cachedRuntime !== undefined) {
    return cachedRuntime;
  }

  try {
    const adk = require('@google/adk');
    cachedRuntime = {
      InMemoryRunner: adk.InMemoryRunner,
      LlmAgent: adk.LlmAgent,
    };
  } catch (error) {
    cachedRuntime = null;
  }

  return cachedRuntime;
}

export function isAdkAvailable(): boolean {
  return !!loadAdkRuntime();
}

export function createAdkRunner(options: {
  agent?: any;
  appName?: string;
  sessionService?: any;
} = {}) {
  const runtime = loadAdkRuntime();
  if (!runtime) return null;

  const { InMemoryRunner } = runtime;
  try {
    return new InMemoryRunner({
      agent: options.agent ?? null,
      appName: options.appName ?? 'ai-study',
      sessionService: options.sessionService,
    });
  } catch (error) {
    console.error('[ADK] Failed to create runner:', error);
    return null;
  }
}

export async function createAdkSession(
  runner: any,
  options: {
    appName: string;
    sessionId: string;
    state?: Record<string, any>;
    userId?: string;
  },
): Promise<any | null> {
  if (!runner?.sessionService) return null;

  const { appName, sessionId, state, userId = 'system' } = options;
  try {
    return runner.sessionService.createSession({
      appName,
      userId,
      sessionId,
      state,
    });
  } catch (error) {
    console.error('[ADK] Failed to create session:', error);
    return null;
  }
}
