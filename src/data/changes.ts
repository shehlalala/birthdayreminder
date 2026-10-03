import type { TableName } from './tables';

// Tiny change feed: local writes and sync pulls announce which tables changed,
// so screens can re-query and the sync runner can schedule a push.
type Listener = (tables: ReadonlySet<TableName>, source: 'local' | 'remote') => void;

const listeners = new Set<Listener>();

export function onDataChange(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function emitDataChange(tables: Iterable<TableName>, source: 'local' | 'remote'): void {
  const set = new Set(tables);
  for (const listener of listeners) listener(set, source);
}
