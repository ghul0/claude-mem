import type { CatalogueObservation } from './catalogue.js';
import type { ObservationRelationKind, ObservationEvidenceBundle } from './types.js';

export interface CandidateSelectorRequest {
  newObservation: CatalogueObservation;
  evidence: ObservationEvidenceBundle | null;
  candidates: CatalogueObservation[];
  model: string;
}

export interface CandidateSelectorResponse {
  candidateIds: number[];
  notes?: string;
  modelUsed?: string;
}

export interface RelationClassifierRequest {
  newObservation: CatalogueObservation;
  evidence: ObservationEvidenceBundle | null;
  candidates: CatalogueObservation[];
  model: string;
}

export interface RelationClassifierDecision {
  oldObservationId: number;
  relation: ObservationRelationKind;
  confidence: number;
  evidence: string;
  reason: string;
  recommendedStatus?: 'superseded' | 'deprecated' | 'weak' | 'stale' | 'active' | null;
}

export interface RelationClassifierResponse {
  decisions: RelationClassifierDecision[];
  modelUsed?: string;
}

export interface ReconciliationLlmCaller {
  selectCandidates(request: CandidateSelectorRequest): Promise<CandidateSelectorResponse>;
  classifyRelations(request: RelationClassifierRequest): Promise<RelationClassifierResponse>;
}

export class NoopReconciliationLlmCaller implements ReconciliationLlmCaller {
  async selectCandidates(_request: CandidateSelectorRequest): Promise<CandidateSelectorResponse> {
    return { candidateIds: [], notes: 'no-op caller (no model configured)' };
  }
  async classifyRelations(_request: RelationClassifierRequest): Promise<RelationClassifierResponse> {
    return { decisions: [] };
  }
}

export class MockReconciliationLlmCaller implements ReconciliationLlmCaller {
  constructor(
    private selectorImpl: (req: CandidateSelectorRequest) => CandidateSelectorResponse,
    private classifierImpl: (req: RelationClassifierRequest) => RelationClassifierResponse
  ) {}
  async selectCandidates(request: CandidateSelectorRequest): Promise<CandidateSelectorResponse> {
    return this.selectorImpl(request);
  }
  async classifyRelations(request: RelationClassifierRequest): Promise<RelationClassifierResponse> {
    return this.classifierImpl(request);
  }
}

export async function createReconciliationCallerFromSettings(): Promise<ReconciliationLlmCaller> {
  const { loadReconciliationSettings } = await import('./settings.js');
  const settings = loadReconciliationSettings();
  if (!settings.enabled) return new NoopReconciliationLlmCaller();
  const { PiReconciliationLlmCaller } = await import('./pi-llm-caller.js');
  return new PiReconciliationLlmCaller();
}
