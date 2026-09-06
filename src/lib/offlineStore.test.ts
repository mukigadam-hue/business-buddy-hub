import { describe, it, expect, beforeEach } from 'vitest';
import {
  getOfflineQueue,
  addToOfflineQueue,
  saveOfflineQueue,
  getOfflineQueueCount,
} from './offlineStore';

describe('offlineStore queue', () => {
  beforeEach(async () => {
    await saveOfflineQueue([]);
  });

  it('reads back what was added', async () => {
    await addToOfflineQueue({ action: 'create_sale', payload: { sale: {} } });
    await addToOfflineQueue({ action: 'create_purchase', payload: { purchase: {} } });

    const queue = await getOfflineQueue();
    expect(queue).toHaveLength(2);
    expect(queue[0].action).toBe('create_sale');
    expect(queue[1].action).toBe('create_purchase');
    expect(await getOfflineQueueCount()).toBe(2);
  });

  it('preserves queue across multiple adds without overwriting', async () => {
    await addToOfflineQueue({ action: 'a', payload: {} });
    await addToOfflineQueue({ action: 'b', payload: {} });
    await addToOfflineQueue({ action: 'c', payload: {} });

    const queue = await getOfflineQueue();
    expect(queue.map((q) => q.action)).toEqual(['a', 'b', 'c']);
  });

  it('saveOfflineQueue replaces the stored queue', async () => {
    await addToOfflineQueue({ action: 'old', payload: {} });
    await saveOfflineQueue([]);
    expect(await getOfflineQueue()).toEqual([]);
    expect(await getOfflineQueueCount()).toBe(0);
  });
});
