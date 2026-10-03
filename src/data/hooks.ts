import { useEffect, useRef, useState } from 'react';

import { onDataChange } from './changes';
import type { SqlDb } from './db';
import { openAppDatabase } from './openAppDatabase';
import type { TableName } from './tables';

/**
 * Runs a query against the local database and re-runs it whenever one of
 * `tables` changes (local edit or sync pull). `deps` re-run it too.
 */
export function useLiveQuery<T>(query: (db: SqlDb) => Promise<T>, tables: readonly TableName[], deps: readonly unknown[]) {
  const [state, setState] = useState<{ data: T | undefined; loading: boolean }>({ data: undefined, loading: true });
  const queryRef = useRef(query);
  queryRef.current = query;

  useEffect(() => {
    let cancelled = false;
    let generation = 0;
    const run = async () => {
      const mine = ++generation;
      const db = await openAppDatabase();
      const data = await queryRef.current(db);
      if (!cancelled && mine === generation) setState({ data, loading: false });
    };
    void run();
    const unsubscribe = onDataChange((changed) => {
      if (tables.some((t) => changed.has(t))) void run();
    });
    return () => {
      cancelled = true;
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tables.join(), ...deps]);

  return state;
}
