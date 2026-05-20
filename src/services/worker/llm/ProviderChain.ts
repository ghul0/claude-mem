import { logger } from '../../../utils/logger.js';
import { SettingsDefaultsManager } from '../../../shared/SettingsDefaultsManager.js';
import { ALL_PROVIDER_IDS, isProviderId, type CoolingState, type ProviderId } from './types.js';

const DEFAULT_COOLDOWN_MS = 60 * 60 * 1000;
const DEFAULT_CHAIN: ProviderId[] = ['gemini-cli', 'codex-spark', 'codex-mini'];

interface CoolingEntry {
  coolingUntil: number;
  reason: string;
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

  getCooldownMs(): number {
    const raw = SettingsDefaultsManager.getInt('CLAUDE_MEM_PROVIDER_COOLDOWN_MS');
    if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_COOLDOWN_MS;
    return raw;
  }

  markCoolingDown(provider: ProviderId, reason: string, retryAfterMs?: number): void {
    const ttl = retryAfterMs !== undefined && retryAfterMs > 0
      ? Math.min(retryAfterMs, this.getCooldownMs())
      : this.getCooldownMs();
    const until = Date.now() + ttl;
    this.cooling.set(provider, { coolingUntil: until, reason });
    logger.warn('CHAIN', `Provider cooling down`, {
      provider,
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

  reset(): void {
    this.cooling.clear();
  }
}

export const globalProviderChain = new ProviderChain();
