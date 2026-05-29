import { logger } from '../../../utils/logger.js';
import { SettingsDefaultsManager, type SettingsDefaults } from '../../../shared/SettingsDefaultsManager.js';
import { ALL_PROVIDER_IDS, isProviderId, type CoolingState, type ProviderId } from './types.js';

const MAX_COOLDOWN_MS = 8 * 24 * 60 * 60 * 1000;
const DEFAULT_CHAIN: ProviderId[] = [
  'antigravity-tm-sonnet',
  'antigravity-ghul-sonnet',
  'antigravity-tm',
  'antigravity-ghul',
  'codex-spark',
  'codex-mini',
];

export type ErrorKind = 'quota_exhausted' | 'rate_limit' | 'transient' | 'unrecoverable' | 'auth_invalid';

const COOLDOWN_DEFAULTS_MS: Record<ErrorKind, number> = {
  quota_exhausted: 60 * 60 * 1000,
  rate_limit: 60 * 1000,
  transient: 90 * 1000,
  unrecoverable: 60 * 60 * 1000,
  auth_invalid: 24 * 60 * 60 * 1000,
};

const COOLDOWN_SETTING_KEYS: Record<ErrorKind, keyof SettingsDefaults> = {
  quota_exhausted: 'CLAUDE_MEM_COOLDOWN_QUOTA_EXHAUSTED_MS',
  rate_limit: 'CLAUDE_MEM_COOLDOWN_RATE_LIMIT_MS',
  transient: 'CLAUDE_MEM_COOLDOWN_TRANSIENT_MS',
  unrecoverable: 'CLAUDE_MEM_COOLDOWN_UNRECOVERABLE_MS',
  auth_invalid: 'CLAUDE_MEM_COOLDOWN_AUTH_INVALID_MS',
};

function normalizeKind(kind: string | undefined): ErrorKind {
  if (kind && kind in COOLDOWN_DEFAULTS_MS) return kind as ErrorKind;
  return 'transient';
}

interface CoolingEntry {
  coolingUntil: number;
  reason: string;
  kind: ErrorKind;
}

export class ProviderChain {
  private cooling = new Map<ProviderId, CoolingEntry>();

  parseChainSetting(): ProviderId[] {
    const raw = SettingsDefaultsManager.get('CLAUDE_MEM_FALLBACK_CHAIN') || '';
    if (!raw.trim()) return [...DEFAULT_CHAIN];

    const parsed: ProviderId[] = [];
    for (const token of raw.split(',').map((s) => s.trim()).filter(Boolean)) {
      if (isProviderId(token)) {
        if (!parsed.includes(token)) parsed.push(token);
      } else {
        logger.warn('CHAIN', `Ignoring unknown provider in chain: ${token}`, { validIds: ALL_PROVIDER_IDS });
      }
    }
    return parsed.length > 0 ? parsed : [...DEFAULT_CHAIN];
  }

  getCooldownMsFor(kind: ErrorKind): number {
    const key = COOLDOWN_SETTING_KEYS[kind];
    const raw = SettingsDefaultsManager.getInt(key);
    if (Number.isFinite(raw) && raw > 0) return raw;
    return COOLDOWN_DEFAULTS_MS[kind];
  }

  markCoolingDown(provider: ProviderId, kind: string | undefined, reason: string, retryAfterMs?: number): void {
    const normalizedKind = normalizeKind(kind);
    const baseTtl = this.getCooldownMsFor(normalizedKind);
    const ttl = retryAfterMs !== undefined && retryAfterMs > 0
      ? Math.min(Math.max(retryAfterMs, baseTtl), MAX_COOLDOWN_MS)
      : baseTtl;
    const until = Date.now() + ttl;
    this.cooling.set(provider, { coolingUntil: until, reason, kind: normalizedKind });
    logger.warn('CHAIN', `Provider cooling down`, {
      provider,
      kind: normalizedKind,
      reason,
      coolingUntil: new Date(until).toISOString(),
      ttlMs: ttl,
    });
  }

  isCoolingDown(provider: ProviderId, now: number = Date.now()): boolean {
    const entry = this.cooling.get(provider);
    if (!entry) return false;
    if (entry.coolingUntil <= now) {
      this.cooling.delete(provider);
      return false;
    }
    return true;
  }

  getNextAvailable(chain: ProviderId[], now: number = Date.now()): ProviderId | null {
    for (const provider of chain) {
      if (!this.isCoolingDown(provider, now)) return provider;
    }
    return null;
  }

  getEarliestReset(chain: ProviderId[]): number | null {
    let earliest: number | null = null;
    for (const provider of chain) {
      const entry = this.cooling.get(provider);
      if (!entry) return Date.now();
      if (earliest === null || entry.coolingUntil < earliest) earliest = entry.coolingUntil;
    }
    return earliest;
  }

  status(): CoolingState[] {
    const out: CoolingState[] = [];
    for (const [provider, entry] of this.cooling.entries()) {
      out.push({ provider, coolingUntil: entry.coolingUntil, reason: entry.reason });
    }
    return out;
  }

  getCoolingKind(provider: ProviderId): ErrorKind | undefined {
    return this.cooling.get(provider)?.kind;
  }

  reset(): void {
    this.cooling.clear();
  }
}

export const globalProviderChain = new ProviderChain();
