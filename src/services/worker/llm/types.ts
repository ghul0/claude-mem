export type ProviderId = 'gemini-cli' | 'codex-spark' | 'codex-mini';

export const ALL_PROVIDER_IDS: ProviderId[] = ['gemini-cli', 'codex-spark', 'codex-mini'];

export function isProviderId(value: string): value is ProviderId {
  return (ALL_PROVIDER_IDS as string[]).includes(value);
}

export interface LlmCallRequest {
  systemPrompt: string;
  userPrompt: string;
  mode: 'json' | 'text';
  timeoutMs: number;
  abortSignal?: AbortSignal;
  agentTag?: string;
}

export interface LlmCallResult {
  text: string;
  provider: ProviderId;
  model: string;
}

export interface LlmCaller {
  readonly providerId: ProviderId;
  readonly modelName: string;
  call(req: LlmCallRequest): Promise<string>;
}

export interface CoolingState {
  provider: ProviderId;
  coolingUntil: number;
  reason: string;
}
