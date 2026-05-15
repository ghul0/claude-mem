import { SettingsDefaultsManager } from '../../../shared/SettingsDefaultsManager.js';

export interface ReconciliationSettings {
  enabled: boolean;
  apply: boolean;
  maxProjectObs: number;
  vectorTopK: number;
  deterministicRecentLimit: number;
  deterministicTop: number;
  candidateChunkSize: number;
  maxCandidates: number;
  fullScanLlm: boolean;
  minApplyConfidence: number;
  minWeakConfidence: number;
  minTerminalEvidenceChars: number;
  model: string;
  selectorModel: string;
  classifierModel: string;
  dailyBudgetUsd: number;
  killSwitch: boolean;
}

export function isReconciliationEnabled(): boolean {
  return SettingsDefaultsManager.getBool('CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED');
}

export function isReconciliationApplyEnabled(): boolean {
  return (
    isReconciliationEnabled() &&
    SettingsDefaultsManager.getBool('CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY')
  );
}

export function loadReconciliationSettings(): ReconciliationSettings {
  return {
    enabled: SettingsDefaultsManager.getBool('CLAUDE_MEM_OBSERVATION_RECONCILIATION_ENABLED'),
    apply: SettingsDefaultsManager.getBool('CLAUDE_MEM_OBSERVATION_RECONCILIATION_APPLY'),
    maxProjectObs: SettingsDefaultsManager.getInt('CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_PROJECT_OBS'),
    vectorTopK: SettingsDefaultsManager.getInt('CLAUDE_MEM_OBSERVATION_RECONCILIATION_VECTOR_TOP_K'),
    deterministicRecentLimit: SettingsDefaultsManager.getInt('CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_RECENT_LIMIT'),
    deterministicTop: SettingsDefaultsManager.getInt('CLAUDE_MEM_OBSERVATION_RECONCILIATION_DETERMINISTIC_TOP'),
    candidateChunkSize: SettingsDefaultsManager.getInt('CLAUDE_MEM_OBSERVATION_RECONCILIATION_CANDIDATE_CHUNK_SIZE'),
    maxCandidates: SettingsDefaultsManager.getInt('CLAUDE_MEM_OBSERVATION_RECONCILIATION_MAX_CANDIDATES'),
    fullScanLlm: SettingsDefaultsManager.getBool('CLAUDE_MEM_OBSERVATION_RECONCILIATION_FULL_SCAN_LLM'),
    minApplyConfidence: parseFloat(SettingsDefaultsManager.get('CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_APPLY_CONFIDENCE')),
    minWeakConfidence: parseFloat(SettingsDefaultsManager.get('CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_WEAK_CONFIDENCE')),
    minTerminalEvidenceChars: SettingsDefaultsManager.getInt('CLAUDE_MEM_OBSERVATION_RECONCILIATION_MIN_TERMINAL_EVIDENCE_CHARS'),
    model: SettingsDefaultsManager.get('CLAUDE_MEM_OBSERVATION_RECONCILIATION_MODEL'),
    selectorModel: SettingsDefaultsManager.get('CLAUDE_MEM_OBSERVATION_RECONCILIATION_SELECTOR_MODEL'),
    classifierModel: SettingsDefaultsManager.get('CLAUDE_MEM_OBSERVATION_RECONCILIATION_CLASSIFIER_MODEL'),
    dailyBudgetUsd: parseFloat(SettingsDefaultsManager.get('CLAUDE_MEM_OBSERVATION_RECONCILIATION_DAILY_BUDGET_USD')) || 0,
    killSwitch: SettingsDefaultsManager.getBool('CLAUDE_MEM_OBSERVATION_RECONCILIATION_KILL_SWITCH'),
  };
}

export function isReconciliationKillSwitchActive(): boolean {
  return SettingsDefaultsManager.getBool('CLAUDE_MEM_OBSERVATION_RECONCILIATION_KILL_SWITCH');
}

export function resolvedSelectorModel(settings: ReconciliationSettings): string {
  return settings.selectorModel || settings.model;
}

export function resolvedClassifierModel(settings: ReconciliationSettings): string {
  return settings.classifierModel || settings.model;
}
