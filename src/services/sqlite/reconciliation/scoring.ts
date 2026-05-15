import type { CatalogueObservation } from './catalogue.js';

export interface ScoredCandidate {
  observation: CatalogueObservation;
  score: number;
  signals: {
    sharedFiles: number;
    sharedConcepts: number;
    sameType: boolean;
    titleOverlap: number;
    narrativeOverlap: number;
    recencyBonus: number;
  };
}

const SCORE_WEIGHTS = {
  sharedFile: 3,
  sharedConcept: 2,
  sameType: 1,
  titleToken: 1,
  narrativeToken: 0.5,
  recency: 1
} as const;

function setOverlap<T>(a: Iterable<T>, b: Iterable<T>): number {
  const setB = new Set(b);
  let count = 0;
  for (const v of a) {
    if (setB.has(v)) count += 1;
  }
  return count;
}

function tokenize(text: string | null): Set<string> {
  if (!text) return new Set();
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9_]+/i)
      .filter(tok => tok.length >= 3)
  );
}

export interface DeterministicScoringInput {
  newObservation: CatalogueObservation;
  candidates: CatalogueObservation[];
  recentLimit?: number;
  topCap: number;
}

export function scoreCandidatesDeterministically(
  input: DeterministicScoringInput
): ScoredCandidate[] {
  const newFiles = new Set([...input.newObservation.files_read, ...input.newObservation.files_modified]);
  const newConcepts = new Set(input.newObservation.concepts);
  const newType = input.newObservation.type;
  const newTitleTokens = tokenize(input.newObservation.title);
  const newNarrativeTokens = tokenize(input.newObservation.narrative);
  const newCreated = input.newObservation.created_at_epoch;
  const recentWindowMs = (input.recentLimit ?? 200) * 24 * 60 * 60 * 1000;

  const scored: ScoredCandidate[] = input.candidates.map(candidate => {
    const candidateFiles = new Set([...candidate.files_read, ...candidate.files_modified]);
    const sharedFiles = setOverlap(newFiles, candidateFiles);

    const sharedConcepts = setOverlap(newConcepts, candidate.concepts);
    const sameType = candidate.type === newType;
    const titleOverlap = setOverlap(newTitleTokens, tokenize(candidate.title));
    const narrativeOverlap = setOverlap(newNarrativeTokens, tokenize(candidate.narrative));

    const ageMs = Math.abs(newCreated - candidate.created_at_epoch);
    const isRecent = ageMs <= recentWindowMs;

    const baseScore =
      sharedFiles * SCORE_WEIGHTS.sharedFile +
      sharedConcepts * SCORE_WEIGHTS.sharedConcept +
      titleOverlap * SCORE_WEIGHTS.titleToken +
      narrativeOverlap * SCORE_WEIGHTS.narrativeToken;

    const hasStructuralSignal = baseScore > 0;
    const sameTypeBonus = sameType && hasStructuralSignal ? SCORE_WEIGHTS.sameType : 0;
    const recencyBonus = isRecent && hasStructuralSignal ? SCORE_WEIGHTS.recency : 0;

    const score = hasStructuralSignal ? baseScore + sameTypeBonus + recencyBonus : 0;

    return {
      observation: candidate,
      score,
      signals: {
        sharedFiles,
        sharedConcepts,
        sameType,
        titleOverlap,
        narrativeOverlap,
        recencyBonus
      }
    };
  });

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return b.observation.created_at_epoch - a.observation.created_at_epoch;
  });

  return scored
    .filter(s => s.score > 0)
    .slice(0, Math.max(0, Math.floor(input.topCap)));
}

export function unionCandidates(
  deterministic: ScoredCandidate[],
  vectorIds: number[],
  maxTotal: number,
  catalogueById: Map<number, CatalogueObservation>
): CatalogueObservation[] {
  const seen = new Set<number>();
  const out: CatalogueObservation[] = [];
  for (const s of deterministic) {
    if (out.length >= maxTotal) break;
    if (seen.has(s.observation.id)) continue;
    seen.add(s.observation.id);
    out.push(s.observation);
  }
  for (const id of vectorIds) {
    if (out.length >= maxTotal) break;
    if (seen.has(id)) continue;
    const obs = catalogueById.get(id);
    if (!obs) continue;
    seen.add(id);
    out.push(obs);
  }
  return out;
}

export function chunkCandidates<T>(items: T[], chunkSize: number): T[][] {
  if (chunkSize <= 0) return [items];
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += chunkSize) {
    chunks.push(items.slice(i, i + chunkSize));
  }
  return chunks;
}
