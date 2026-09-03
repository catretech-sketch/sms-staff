import { distanceMeters } from '@/lib/geo';

describe('distanceMeters', () => {
  it('returns 0 for identical coordinates', () => {
    expect(distanceMeters({ lat: 28.4595, lng: 77.0266 }, { lat: 28.4595, lng: 77.0266 })).toBe(0);
  });

  it('computes a known short distance (~50m) within tolerance', () => {
    // School Gate seed coord vs a point ~50m north
    const a = { lat: 28.4595, lng: 77.0266 };
    const b = { lat: 28.45995, lng: 77.0266 };
    const d = distanceMeters(a, b);
    expect(d).toBeGreaterThan(45);
    expect(d).toBeLessThan(55);
  });

  it('computes a known long distance (~1.1km) within tolerance', () => {
    // School Gate vs Sector 12 seed stop
    const a = { lat: 28.4595, lng: 77.0266 };
    const b = { lat: 28.4660, lng: 77.0410 };
    const d = distanceMeters(a, b);
    expect(d).toBeGreaterThan(1300);
    expect(d).toBeLessThan(1600);
  });

  it('is symmetric', () => {
    const a = { lat: 28.4595, lng: 77.0266 };
    const b = { lat: 28.4850, lng: 77.0770 };
    expect(distanceMeters(a, b)).toBeCloseTo(distanceMeters(b, a), 6);
  });
});
