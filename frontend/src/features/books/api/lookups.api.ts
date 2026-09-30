import { http } from '../../../shared/api/http';

export type LookupItem = {
  id: string;
  name: string;
};

export async function listAuthors(): Promise<LookupItem[]> {
  return http.get<LookupItem[]>('/authors');
}

export async function listPublishers(): Promise<LookupItem[]> {
  return http.get<LookupItem[]>('/publishers');
}

export async function listGenres(): Promise<LookupItem[]> {
  return http.get<LookupItem[]>('/genres');
}
