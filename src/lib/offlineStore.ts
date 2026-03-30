import localforage from 'localforage';

// Configure localforage to use IndexedDB
const dataStore = localforage.createInstance({
  name: 'biztrack',
  storeName: 'business_data',
  description: 'BizTrack offline business data',
});

const queueStore = localforage.createInstance({
  name: 'biztrack',
  storeName: 'offline_queue',
  description: 'BizTrack offline operation queue',
});

// ── Generic cache helpers ──

export async function cacheGet<T>(key: string, fallback: T): Promise<T> {
  try {
    const val = await dataStore.getItem<T>(key);
    return val !== null && val !== undefined ? val : fallback;
  } catch {
    return fallback;
  }
}

export async function cacheSet<T>(key: string, value: T): Promise<void> {
  try {
    await dataStore.setItem(key, value);
  } catch (e) {
    console.warn('offlineStore cacheSet failed:', e);
  }
}

export async function cacheRemove(key: string): Promise<void> {
  try {
    await dataStore.removeItem(key);
  } catch {}
}

export async function cacheClear(): Promise<void> {
  try {
    await dataStore.clear();
  } catch {}
}

// ── Offline Queue helpers (IndexedDB-backed) ──

export interface OfflineQueueItem {
  id: string;
  timestamp: number;
  action: string;
  payload: any;
  optimisticIds?: string[];
}

const QUEUE_KEY = 'pending_operations';

export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  return cacheGet<OfflineQueueItem[]>(QUEUE_KEY, []);
}

export async function addToOfflineQueue(item: Omit<OfflineQueueItem, 'id' | 'timestamp'>): Promise<void> {
  const queue = await getOfflineQueue();
  queue.push({
    ...item,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  await queueStore.setItem(QUEUE_KEY, queue);
  window.dispatchEvent(new CustomEvent('biztrack_queue_changed', { detail: { count: queue.length } }));
}

export async function saveOfflineQueue(queue: OfflineQueueItem[]): Promise<void> {
  await queueStore.setItem(QUEUE_KEY, queue);
  window.dispatchEvent(new CustomEvent('biztrack_queue_changed', { detail: { count: queue.length } }));
}

export async function getOfflineQueueCount(): Promise<number> {
  const queue = await getOfflineQueue();
  return queue.length;
}

// ── Cache key constants ──

export const CACHE_KEYS = {
  businesses: 'businesses',
  memberships: 'memberships',
  stock: 'stock',
  sales: 'sales',
  purchases: 'purchases',
  orders: 'orders',
  services: 'services',
  expenses: 'expenses',
  currentBusiness: 'currentBusiness',
  // Factory
  rawMaterials: 'factory_raw_materials',
  factoryExpenses: 'factory_expenses',
  factoryTeam: 'factory_team',
  factoryProduction: 'factory_production',
  factoryWorkerPayments: 'factory_worker_payments',
  factoryWorkerAdvances: 'factory_worker_advances',
  // Property
  propertyAssets: 'property_assets',
  propertyBookings: 'property_bookings',
  propertyConversations: 'property_conversations',
} as const;

// ── Sync-aware localStorage bridge for fast sync reads during init ──
// We store a fast-read copy in localStorage for instant boot,
// but the primary store is IndexedDB via localforage.

export function readJsonSync<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`biztrack_idb_${key}`);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function writeJsonSync<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`biztrack_idb_${key}`, JSON.stringify(value));
  } catch {}
}

export function removeJsonSync(key: string): void {
  try {
    localStorage.removeItem(`biztrack_idb_${key}`);
  } catch {}
}

// Write to both IndexedDB (primary) and localStorage (fast boot)
export async function cachePersist<T>(key: string, value: T): Promise<void> {
  writeJsonSync(key, value);
  await cacheSet(key, value);
}
