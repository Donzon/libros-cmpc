import { z } from 'zod';

/** Decimal exacto con 0–2 decimales (espejo CreateBookDto / REQ-D2). */
const priceSchema = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, 'El precio debe ser un decimal con hasta 2 decimales');

export const bookFormSchema = z.object({
  title: z.string().trim().min(1, 'El título es obligatorio'),
  price: priceSchema,
  available: z.boolean(),
  authorId: z.uuid('Selecciona un autor'),
  publisherId: z.uuid('Selecciona una editorial'),
  genreId: z.uuid('Selecciona un género'),
});

export type BookFormValues = z.infer<typeof bookFormSchema>;

export const EMPTY_BOOK_FORM_VALUES: BookFormValues = {
  title: '',
  price: '',
  available: true,
  authorId: '',
  publisherId: '',
  genreId: '',
};
