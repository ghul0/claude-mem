export type ProviderId =
  | 'antigravity-tm'
  | 'antigravity-ghul'
  | 'codex-spark'
  | 'minimax-m3'
  | 'codex-mini'
  | 'claude-haiku';

export const ALL_PROVIDER_IDS: ProviderId[] = [
  'antigravity-tm',
  'antigravity-ghul',
  'codex-spark',
  'minimax-m3',
  'codex-mini',
  'claude-haiku',
];

export function isProviderId(value: string): value is ProviderId {
  return (ALL_PROVIDER_IDS as string[]).includes(value);
}

export interface ValidationResult {
  valid: boolean;
  feedback?: string;
}

export type ResponseValidator = (text: string) => ValidationResult;

export interface LlmCallRequest {
  systemPrompt: string;
  userPrompt: string;
  mode: 'json' | 'text';
  timeoutMs: number;
  abortSignal?: AbortSignal;
  agentTag?: string;
  validate?: ResponseValidator;
  maxValidationRetries?: number;
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
