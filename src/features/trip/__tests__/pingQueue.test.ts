import { shouldPublish, createPingBuffer } from '@/features/trip/pingQueue';

describe('shouldPublish', () => {
  it('publishes the first ping', () => {
    expect(shouldPublish(null, { lat: 0, lng: 0, at: 1000 }, 10_000, 50)).toBe(true);
  });
  it('publishes after the cadence interval', () => {
    const last = { lat: 0, lng: 0, at: 0 };
    expect(shouldPublish(last, { lat: 0, lng: 0, at: 11_000 }, 10_000, 50)).toBe(true);
  });
  it('publishes after moving past the distance threshold', () => {
    const last = { lat: 0, lng: 0, at: 0 };
    expect(shouldPublish(last, { lat: 0.001, lng: 0, at: 1000 }, 10_000, 50)).toBe(true);
  });
  it('skips when neither time nor distance threshold is met', () => {
    const last = { lat: 0, lng: 0, at: 0 };
    expect(shouldPublish(last, { lat: 0, lng: 0, at: 1000 }, 10_000, 50)).toBe(false);
  });
});

describe('createPingBuffer (offline queue)', () => {
  it('flushes queued items in order and clears on success', async () => {
    const sent: number[] = [];
    const buf = createPingBuffer(async (p: { n: number }) => { sent.push(p.n); });
    buf.enqueue({ n: 1 });
    buf.enqueue({ n: 2 });
    await buf.flush();
    expect(sent).toEqual([1, 2]);
    expect(buf.size()).toBe(0);
  });
  it('retains items when the sender throws', async () => {
    const buf = createPingBuffer(async () => { throw new Error('offline'); });
    buf.enqueue({ n: 1 });
    await buf.flush();
    expect(buf.size()).toBe(1);
  });
});
