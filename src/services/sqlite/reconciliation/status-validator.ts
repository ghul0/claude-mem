const PLACEHOLDER_PATTERNS: RegExp[] = [
  /^see above$/i,
  /^same as above$/i,
  /^as discussed$/i,
  /^above$/i,
  /^n\/a$/i,
  /^none$/i
];

const PATH_PATTERN = /[\/\\][\w\-.]+/;
const OBSERVATION_ID_PATTERN = /(?:#|observation\s+#?)\d+/i;
const TOOL_NAME_PATTERN = /\b(?:read|edit|write|bash|grep|glob|task|webfetch|websearch)\b/i;
const QUOTE_PATTERN = /"[^"]{6,}"|'[^']{6,}'/;

export interface EvidenceValidationResult {
  valid: boolean;
  reason: string | null;
}

export function validateTerminalEvidence(
  evidence: string | null | undefined,
  minChars: number
): EvidenceValidationResult {
  if (evidence === null || evidence === undefined) {
    return { valid: false, reason: 'evidence_missing' };
  }
  const trimmed = evidence.trim();
  if (trimmed.length === 0) {
    return { valid: false, reason: 'evidence_empty' };
  }
  if (trimmed.length < minChars) {
    return { valid: false, reason: 'evidence_too_short' };
  }
  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(trimmed)) {
      return { valid: false, reason: 'evidence_is_placeholder' };
    }
  }
  const hasPath = PATH_PATTERN.test(trimmed);
  const hasObsId = OBSERVATION_ID_PATTERN.test(trimmed);
  const hasToolName = TOOL_NAME_PATTERN.test(trimmed);
  const hasQuote = QUOTE_PATTERN.test(trimmed);
  if (!hasPath && !hasObsId && !hasToolName && !hasQuote) {
    return { valid: false, reason: 'evidence_lacks_anchor' };
  }
  return { valid: true, reason: null };
}

export function isValidTerminalEvidence(evidence: string | null | undefined, minChars: number): boolean {
  return validateTerminalEvidence(evidence, minChars).valid;
}
