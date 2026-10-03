// How each synced table maps between local SQLite rows and Supabase rows.
// Order matters: parents are pushed and pulled before their children.

export type TableName = 'people' | 'reminders' | 'gift_ideas' | 'user_settings';
export type LocalRow = Record<string, string | number | null>;
export type RemoteRow = Record<string, unknown>;

export interface TableSpec {
  name: TableName;
  /** Synced columns as named locally (excludes dirty / sync_error). */
  columns: readonly string[];
  /** Server column that identifies a row: upsert conflict target and paging tiebreaker. */
  remoteKey: 'id' | 'user_id';
  toRemote(row: LocalRow, userId: string): RemoteRow;
  fromRemote(row: RemoteRow): LocalRow;
}

/** Server timestamps look like 2026-10-03T15:17:33.123456+00:00; store ISO with ms. */
export function normalizeTimestamp(value: unknown): string | null {
  if (value == null) return null;
  return new Date(toMillis(String(value))).toISOString();
}

/** Parses a Postgres/ISO timestamp to epoch ms. Trims microseconds (Hermes-safe). */
export function toMillis(value: string): number {
  const ms = Date.parse(value.replace(' ', 'T').replace(/(\.\d{3})\d+/, '$1'));
  if (Number.isNaN(ms)) throw new Error(`Unparseable timestamp: ${value}`);
  return ms;
}

function hhmm(value: unknown): string | null {
  return value == null ? null : String(value).slice(0, 5);
}

const num = (v: unknown) => (v == null ? null : Number(v));

/** Columns that are the same on both sides apart from type coercion. */
function passthrough(columns: readonly string[], row: Record<string, unknown>, coerce: Record<string, (v: unknown) => unknown>) {
  const out: Record<string, unknown> = {};
  for (const c of columns) out[c] = (coerce[c] ?? ((v: unknown) => v ?? null))(row[c]);
  return out;
}

const timestampCols = { created_at: normalizeTimestamp, updated_at: normalizeTimestamp, deleted_at: normalizeTimestamp };

function entityTable(
  name: Exclude<TableName, 'user_settings'>,
  columns: readonly string[],
  fromRemoteCoerce: Record<string, (v: unknown) => unknown> = {},
  toRemoteCoerce: Record<string, (v: unknown) => unknown> = {},
): TableSpec {
  return {
    name,
    columns,
    remoteKey: 'id',
    toRemote: (row, userId) => ({ ...passthrough(columns, row, toRemoteCoerce), user_id: userId }),
    fromRemote: (row) => passthrough(columns, row, { ...timestampCols, ...fromRemoteCoerce }) as LocalRow,
  };
}

const common = ['id', 'created_at', 'updated_at', 'deleted_at'] as const;

export const TABLES: readonly TableSpec[] = [
  entityTable(
    'people',
    [...common, 'name', 'birth_day', 'birth_month', 'birth_year', 'relation_key', 'relation_custom', 'photo_path', 'note', 'reminder_time'],
    { birth_day: num, birth_month: num, birth_year: num, reminder_time: hhmm },
  ),
  entityTable('reminders', [...common, 'person_id', 'days_before'], { days_before: num }),
  entityTable(
    'gift_ideas',
    [...common, 'person_id', 'title', 'note', 'url', 'price', 'bought', 'given_year'],
    { price: num, given_year: num, bought: (v) => (v ? 1 : 0) },
    { bought: (v) => Boolean(v) },
  ),
  {
    name: 'user_settings',
    columns: ['id', 'reminder_time', 'default_reminder_days', 'created_at', 'updated_at'],
    remoteKey: 'user_id',
    toRemote: (row, userId) => ({
      user_id: userId,
      reminder_time: row.reminder_time,
      default_reminder_days: JSON.parse(String(row.default_reminder_days)),
      created_at: row.created_at,
      updated_at: row.updated_at,
    }),
    fromRemote: (row) => ({
      id: 'me',
      reminder_time: hhmm(row.reminder_time),
      default_reminder_days: JSON.stringify(row.default_reminder_days ?? []),
      created_at: normalizeTimestamp(row.created_at),
      updated_at: normalizeTimestamp(row.updated_at),
    }),
  },
];
