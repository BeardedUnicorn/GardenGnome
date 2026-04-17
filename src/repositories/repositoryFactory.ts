import { isTauri } from '@tauri-apps/api/core';

import { BrowserGardenRepository } from '@/repositories/browserGardenRepository';
import type { GardenRepository } from '@/repositories/contracts';
import { SqliteGardenRepository } from '@/repositories/sqliteGardenRepository';

let cachedRepository: GardenRepository | null = null;

export const getGardenRepository = (): GardenRepository => {
  if (cachedRepository) {
    return cachedRepository;
  }

  cachedRepository = isTauri()
    ? new SqliteGardenRepository()
    : new BrowserGardenRepository();

  return cachedRepository;
};
