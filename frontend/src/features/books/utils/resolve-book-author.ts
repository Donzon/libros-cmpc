import type { LookupItem } from '../api/lookups.api';
import type { BookFormValues } from '../schemas/book.schema';

export async function resolveBookAuthorId(
  values: BookFormValues,
  createAuthor: (name: string) => Promise<LookupItem>,
): Promise<string> {
  if (values.authorMode === 'existing') {
    return values.authorId;
  }

  const author = await createAuthor(values.authorName.trim());
  return author.id;
}
