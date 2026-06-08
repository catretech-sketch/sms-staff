// src/i18n/__tests__/keys.test.ts
import en from '@/i18n/resources/en.json';
import hi from '@/i18n/resources/hi.json';
import mr from '@/i18n/resources/mr.json';
import ta from '@/i18n/resources/ta.json';

// Use array form so Jest treats the key literally (no dot-path traversal)
const REQUIRED = ['login.sendOtp','home.tapCheckIn','attendance.checkIn','nav.home','role.cook.meals'];

describe('i18n key parity', () => {
  it('every language has the required new keys', () => {
    for (const dict of [en, hi, mr, ta]) for (const k of REQUIRED) expect(dict).toHaveProperty([k]);
  });
  it('all four dictionaries have identical key sets', () => {
    const keys = (o: object) => Object.keys(o).sort();
    expect(keys(hi)).toEqual(keys(en));
    expect(keys(mr)).toEqual(keys(en));
    expect(keys(ta)).toEqual(keys(en));
  });
});
