import { z } from 'zod';

/** Decimal exacto con 0–2 decimales (espejo CreateBookDto / REQ-D2). */
const priceSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'El precio debe ser un decimal con hasta 2 decimales');

export const AUTHOR_MODE = ['existing', 'new'] as const;
export type AuthorMode = (typeof AUTHOR_MODE)[number];

export const bookFormSchema = z
  .object({
    title: z.string().trim().min(1, 'El título es obligatorio'),
    price: priceSchema,
    available: z.boolean(),
    authorMode: z.enum(AUTHOR_MODE),
    authorId: z.string(),
    authorName: z.string().max(200, 'Máximo 200 caracteres'),
    publisherId: z.uuid('Selecciona una editorial'),
    genreId: z.uuid('Selecciona un género'),
  })
  .superRefine((values, ctx) => {
    if (values.authorMode === 'existing') {
      const parsed = z.uuid().safeParse(values.authorId);
      if (!parsed.success) {
        ctx.addIssue({
          code: 'custom',
          path: ['authorId'],
          message: 'Selecciona un autor',
        });
      }
      return;
    }

    if (values.authorName.trim().length === 0) {
      ctx.addIssue({
        code: 'custom',
        path: ['authorName'],
        message: 'El nombre del autor es obligatorio',
      });
    }
  });

export type BookFormValues = z.infer<typeof bookFormSchema>;

export const EMPTY_BOOK_FORM_VALUES: BookFormValues = {
  title: '',
  price: '',
  available: true,
  authorMode: 'existing',
  authorId: '',
  authorName: '',
  publisherId: '',
  genreId: '',
};

export type BookWritePayload = {
  title: string;
  price: string;
  available: boolean;
  authorId: string;
  publisherId: string;
  genreId: string;
};

export function toBookWritePayload(
  values: BookFormValues,
  authorId: string,
): BookWritePayload {
  return {
    title: values.title,
    price: values.price,
    available: values.available,
    authorId,
    publisherId: values.publisherId,
    genreId: values.genreId,
  };
}
