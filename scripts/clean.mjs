import { rm } from 'node:fs/promises';
for (const path of ['../dist/', '../.build/']) {
  await rm(new URL(path, import.meta.url), { recursive: true, force: true });
}
