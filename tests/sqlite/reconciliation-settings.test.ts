import { describe, it, expect, beforeEach, afterEach } from 'bun:test';
import { SettingsDefaultsManager } from '../../src/shared/SettingsDefaultsManager.js';
import {
  isReconciliationEnabled,
  isReconciliationApplyEnabled,
  loadReconciliationSettings,
  resolvedSelectorModel,
  resolvedClassifierModel
} from '../../src/services/sqlite/reconciliation/settings.js';

const KEYS = [
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_PROJECT_OBS',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_VECTOR_TOP_K',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_RECENT_LIMIT',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_TOP',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_CANDIDATE_CHUNK_SIZE',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_CANDIDATES',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_FULL_SCAN_LLM',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_APPLY_CONFIDENCE',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_WEAK_CONFIDENCE',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_TERMINAL_EVIDENCE_CHARS',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_SELECTOR_MODEL',
  'CLAUDE_MEM_OBSERVATION_RECONCILIATION_CLASSIFIER_MODEL'
] as const;

describe('Reconciliation settings', () => {
  const saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const k of KEYS) {
      saved[k] = process.env[k];
      delete process.env[k];
    }
  });

  afterEach(() => {
    for (const k of KEYS) {
      if (saved[k] === undefined) {
        delete process.env[k];
      } else {
        process.env[k] = saved[k];
      }
    }
  });

  it('exposes all reconciliation settings keys in defaults', () => {
    const defaults = SettingsDefaultsManager.getAllDefaults();
    for (const k of KEYS) {
      expect(defaults).toHaveProperty(k);
    }
  });

  it('disables feature by default (master flag off)', () => {
    expect(isReconciliationEnabled()).toBe(false);
    expect(isReconciliationApplyEnabled()).toBe(false);
  });

  it('apply flag requires master flag', () => {
    process.env.CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY = 'true';
    expect(isReconciliationApplyEnabled()).toBe(false);
    process.env.CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED = 'true';
    expect(isReconciliationApplyEnabled()).toBe(true);
  });

  it('loads typed settings with numeric coercion', () => {
    const cfg = loadReconciliationSettings();
    expect(cfg.enabled).toBe(false);
    expect(cfg.apply).toBe(false);
    expect(cfg.maxProjectObs).toBe(5000);
    expect(cfg.vectorTopK).toBe(200);
    expect(cfg.deterministicRecentLimit).toBe(200);
    expect(cfg.deterministicTop).toBe(200);
    expect(cfg.candidateChunkSize).toBe(200);
    expect(cfg.maxCandidates).toBe(40);
    expect(cfg.fullScanLlm).toBe(false);
    expect(cfg.minApplyConfidence).toBeCloseTo(0.9);
    expect(cfg.minWeakConfidence).toBeCloseTo(0.65);
    expect(cfg.minTerminalEvidenceChars).toBe(40);
    expect(cfg.model).toBe('');
    expect(cfg.selectorModel).toBe('');
    expect(cfg.classifierModel).toBe('');
  });

  it('falls back to model for selector/classifier when role override is empty', () => {
    process.env.CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL = 'cheap-json';
    const cfg = loadReconciliationSettings();
    expect(resolvedSelectorModel(cfg)).toBe('cheap-json');
    expect(resolvedClassifierModel(cfg)).toBe('cheap-json');
  });

  it('honors role overrides when set', () => {
    process.env.CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL = 'cheap-json';
    process.env.CLAUDE_MEM_OBSERVATION_RECONCILIATION_CLASSIFIER_MODEL = 'sonnet-4-6';
    const cfg = loadReconciliationSettings();
    expect(resolvedSelectorModel(cfg)).toBe('cheap-json');
    expect(resolvedClassifierModel(cfg)).toBe('sonnet-4-6');
  });
});
