import { schema, type DB } from '@/db/client';

export type SettingsMap = Record<string, string>;

const cache = new WeakMap<object, Promise<SettingsMap>>();

export function getSettings(db: DB, locals: object): Promise<SettingsMap> {
  let p = cache.get(locals);

  if (!p) {
    p = (async () => {
      const rows = await db.select().from(schema.settings).all();
      return Object.fromEntries(rows.map((row) => [row.key, row.value]));
    })();
    cache.set(locals, p);
  }

  return p;
}

export function getSetting(map: SettingsMap, key: string, fallback = ''): string {
  return map[key] ?? fallback;
}

export async function upsertSettings(db: DB, kv: Record<string, string>): Promise<void> {
  for (const [key, value] of Object.entries(kv)) {
    await db
      .insert(schema.settings)
      .values({ key, value })
      .onConflictDoUpdate({
        target: schema.settings.key,
        set: { value },
      })
      .run();
  }
}
