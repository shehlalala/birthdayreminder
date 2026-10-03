import { useEffect } from 'react';

import { startSync } from './syncRunner';

/** Mounted once in the root layout. Native only; see SyncBoot.web.tsx. */
export function SyncBoot() {
  useEffect(() => startSync(), []);
  return null;
}
