export const agentStepTimeoutMs = 60_000;
export const agentStepAttempts = 2;

export class AgentStepTimeoutError extends Error {
  constructor(
    public readonly stepName: string,
    public readonly timeoutMs: number
  ) {
    super(`${stepName} timed out after ${timeoutMs}ms`);
    this.name = "AgentStepTimeoutError";
  }
}

async function withTimeout<T>(stepName: string, promise: Promise<T>, timeoutMs: number) {
  let timeout: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new AgentStepTimeoutError(stepName, timeoutMs)), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) clearTimeout(timeout);
  }
}

export async function runAgentStep<T>(
  stepName: string,
  run: () => Promise<T>,
  options: { timeoutMs?: number; attempts?: number } = {}
) {
  const timeoutMs = options.timeoutMs ?? agentStepTimeoutMs;
  const attempts = options.attempts ?? agentStepAttempts;
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await withTimeout(stepName, run(), timeoutMs);
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error ? lastError : new Error(`${stepName} failed`);
}
