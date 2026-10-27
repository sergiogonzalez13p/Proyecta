import { z } from 'zod';

const optionalUrl = z.string()
  .trim()
  .max(500, 'El enlace es demasiado largo.')
  .url('Escribe una URL válida (incluye https://).')
  .refine((value) => {
    try { return ['http:', 'https:'].includes(new URL(value).protocol); }
    catch { return false; }
  }, 'Usa un enlace con http:// o https://.')
  .optional()
  .or(z.literal(''));

const technologies = z.preprocess(
  (value) => (typeof value === 'string' ? value.split(',') : value),
  z.array(z.string().trim().min(1, 'Cada tecnología debe tener un nombre.').max(32)).min(1, 'Añade al menos una tecnología.').max(8, 'Puedes añadir hasta 8 tecnologías.'),
);

export const projectSchema = z.object({
  title: z.string().trim().min(5, 'El título debe tener al menos 5 caracteres.').max(80, 'El título no puede superar 80 caracteres.'),
  description: z.string().trim().min(20, 'La descripción debe tener al menos 20 caracteres.').max(1200, 'La descripción no puede superar 1200 caracteres.'),
  category: z.string().trim().min(2, 'Elige una categoría.').max(40),
  technologies,
  imageUrl: optionalUrl,
  mediaUrl: optionalUrl,
  demoUrl: optionalUrl,
  repoUrl: optionalUrl,
  contactName: z.string().trim().min(2, 'Indica el nombre de contacto.').max(80),
  contactEmail: z.string().trim().email('Escribe un correo válido; también aceptamos Gmail.').max(254),
  contactUrl: optionalUrl,
}).strict();

export const ratingSchema = z.object({
  rating: z.number().int().min(1).max(5),
  voterId: z.string().uuid(),
}).strict();

export const ownerKeySchema = z.object({
  ownerKey: z.string().regex(/^[A-Za-z0-9_-]{43}$/, 'La clave privada no tiene un formato válido.'),
}).strict();
