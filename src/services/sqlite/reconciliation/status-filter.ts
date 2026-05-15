import type { ObservationStatus } from './types.js';
import { OBSERVATION_STATUSES, NON_TERMINAL_OBSERVATION_STATUSES } from './types.js';
import { isReconciliationEnabled } from './settings.js';

const VALID_STATUS_SET: ReadonlySet<string> = new Set(OBSERVATION_STATUSES);

export interface ParsedStatusFilter {
  statuses: ObservationStatus[];
  filterApplied: boolean;
}

export class StatusFilterError extends Error {
  constructor(message: string, public readonly invalid: string[]) {
    super(message);
    this.name = 'StatusFilterError';
  }
}

export function parseStatusFilter(
  raw: string | undefined | null,
  options: { featureEnabled?: boolean } = {}
): ParsedStatusFilter {
  const featureEnabled = options.featureEnabled ?? isReconciliationEnabled();
  if (!featureEnabled) {
    return { statuses: [...OBSERVATION_STATUSES], filterApplied: false };
  }
  if (raw === undefined || raw === null || raw === '') {
    return { statuses: [...NON_TERMINAL_OBSERVATION_STATUSES], filterApplied: true };
  }
  const parts = raw
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  const invalid = parts.filter(p => !VALID_STATUS_SET.has(p));
  if (invalid.length > 0) {
    throw new StatusFilterError(`Unknown status values: ${invalid.join(',')}`, invalid);
  }
  return { statuses: parts as ObservationStatus[], filterApplied: true };
}

export interface StatusSqlClause {
  sql: string;
  params: string[];
}

export function buildStatusSqlClause(
  statuses: ObservationStatus[],
  options: { columnExpr?: string } = {}
): StatusSqlClause {
  const column = options.columnExpr ?? "COALESCE(status, 'active')";
  if (statuses.length === 0) {
    return { sql: '1=0', params: [] };
  }
  const placeholders = statuses.map(() => '?').join(',');
  return {
    sql: `${column} IN (${placeholders})`,
    params: [...statuses]
  };
}

export interface StatusFilterApplied {
  statuses: ObservationStatus[];
  filterApplied: boolean;
}

export function applyStatusFilter(filter: ParsedStatusFilter): StatusFilterApplied {
  return {
    statuses: filter.statuses,
    filterApplied: filter.filterApplied
  };
}
