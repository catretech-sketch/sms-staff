import type { ProfileRepository } from '@/data/repositories/types';
import type { HttpClient } from '@/lib/httpClient';
import { toProfile, type ProfileDTO } from './mappers';

export function httpProfile(http: HttpClient): ProfileRepository {
  return { get: () => http.get<ProfileDTO>('/staff/profile').then(toProfile) };
}
