import { randomUUID } from 'expo-crypto';

import type { WriteDeps } from './writes';

export const appWriteDeps: WriteDeps = { newId: randomUUID, now: () => new Date() };
