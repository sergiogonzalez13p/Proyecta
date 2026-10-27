import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { fileTypeFromBuffer } from 'file-type';
import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto';
import { existsSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { basename, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, serializeProject } from './database.js';
import { ownerKeySchema, projectSchema, ratingSchema } from './validation.js';

const app = express();
const port = Number(process.env.PORT || 3001);
const uploadsDirectory = process.env.UPLOADS_DIRECTORY
  ? resolve(process.env.UPLOADS_DIRECTORY)
  : fileURLToPath(new URL('../uploads/', import.meta.url));
mkdirSync(uploadsDirectory, { recursive: true });
app.disable('x-powered-by');
app.use(cors({ origin: process.env.FRONTEND_ORIGIN || 'http://localhost:3000' }));
app.use(express.json({ limit: '64kb' }));
app.use('/uploads', express.static(uploadsDirectory, {
  maxAge: 0,
  setHeaders: (response) => response.setHeader('X-Content-Type-Options', 'nosniff'),
}));

const allowedFiles = {
  cover: {
    '.jpg': ['image/jpeg'], '.jpeg': ['image/jpeg'], '.png': ['image/png'],
    '.webp': ['image/webp'], '.gif': ['image/gif'],
  },
  media: {
    '.mp4': ['video/mp4'], '.webm': ['video/webm'], '.mov': ['video/quicktime'],
    '.mp3': ['audio/mpeg'], '.m4a': ['audio/mp4', 'audio/x-m4a'],
    '.wav': ['audio/wav', 'audio/x-wav', 'audio/wave'],
    '.ogg': ['audio/ogg', 'application/ogg'], '.pdf': ['application/pdf'],
  },
};

const projectUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fields: 12, files: 2, parts: 14, fieldSize: 64 * 1024, fileSize: 16 * 1024 * 1024 },
  fileFilter: (_request, file, callback) => {
    const extension = extname(file.originalname).toLowerCase();
    const validMimes = allowedFiles[file.fieldname]?.[extension];
    if (!validMimes?.includes(file.mimetype)) {
      const error = new Error(file.fieldname === 'cover'
        ? 'La portada debe ser una imagen JPG, PNG, WEBP o GIF.'
        : 'El medio debe ser un video, audio o PDF en un formato permitido.');
      error.status = 400;
      error.field = file.fieldname;
      return callback(error);
    }
    return callback(null, true);
  },
});

const projectSelect = `
  SELECT p.*, COALESCE(AVG(r.rating), 0) AS rating_average, COUNT(r.id) AS rating_count
  FROM projects p LEFT JOIN project_ratings r ON r.project_id = p.id
`;

function findProject(id) {
  return db.get(`${projectSelect} WHERE p.id = ? GROUP BY p.id`, [id]);
}

function parseId(value) {
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function digest(value) {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function ownerKeyMatchesToken(token, storedHash) {
  if (typeof storedHash !== 'string' || !/^[a-f0-9]{64}$/i.test(storedHash)) return false;
  if (typeof token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(token)) return false;
  const expected = Buffer.from(storedHash, 'hex');
  const supplied = Buffer.from(digest(token), 'hex');
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}

function ownerKeyMatches(request, storedHash) {
  const token = request.get('Authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
  return ownerKeyMatchesToken(token, storedHash);
}

function storeUpload(file) {
  const extension = extname(file.originalname).toLowerCase();
  const filename = `${randomUUID()}${extension}`;
  const destination = resolve(uploadsDirectory, filename);
  writeFileSync(destination, file.buffer, { flag: 'wx' });
  return { url: `/uploads/${filename}`, path: destination };
}

async function verifyFileSignature(file, field) {
  const detected = await fileTypeFromBuffer(file.buffer);
  const extension = extname(file.originalname).toLowerCase();
  const allowedMimes = allowedFiles[field]?.[extension];
  if (!detected || !allowedMimes?.includes(detected.mime)) {
    const error = new Error(field === 'cover'
      ? 'El contenido del archivo no coincide con una imagen permitida.'
      : 'El contenido del archivo no coincide con un medio permitido.');
    error.status = 400;
    error.field = field;
    throw error;
  }
}

function removeStoredUpload(url) {
  if (typeof url !== 'string' || !url.startsWith('/uploads/')) return;
  const filename = url.slice('/uploads/'.length);
  if (filename !== basename(filename) || !/^[a-f0-9-]{36}\.(jpg|jpeg|png|webp|gif|mp4|webm|mov|mp3|m4a|wav|ogg|pdf)$/i.test(filename)) return;
  const destination = resolve(uploadsDirectory, filename);
  if (!destination.startsWith(`${resolve(uploadsDirectory)}${sep}`)) return;
  if (existsSync(destination)) unlinkSync(destination);
}

function getUploadedFiles(request) {
  const files = request.files || {};
  return { coverFile: files.cover?.[0], mediaFile: files.media?.[0] };
}

function rejectOversizedCover(coverFile, response) {
  if (!coverFile || coverFile.size <= 8 * 1024 * 1024) return false;
  const message = 'La imagen de portada no puede superar 8 MB.';
  response.status(400).json({ error: message, fields: [{ field: 'coverFile', message }] });
  return true;
}

function sendProjectValidation(result, response) {
  if (result.success) return false;
  response.status(400).json({
    error: 'Revisa los campos del formulario.',
    fields: result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
  });
  return true;
}

function ensureExistingProject(rawId, response) {
  const id = parseId(rawId);
  if (!id) {
    response.status(400).json({ error: 'Identificador de proyecto inválido.' });
    return null;
  }
  const row = db.get('SELECT * FROM projects WHERE id = ?', [id]);
  if (!row) {
    response.status(404).json({ error: 'No encontramos ese proyecto.' });
    return null;
  }
  return { id, row };
}

function rejectNonOwner(request, row, response) {
  if (ownerKeyMatches(request, row.owner_key_hash)) return false;
  response.status(403).json({ error: 'Se requiere la clave privada del propietario de este proyecto.' });
  return true;
}

app.get('/api/health', (_req, res) => res.json({ ok: true, service: 'proyecta-api' }));

app.get('/api/projects', (req, res) => {
  const { category, technology, q } = req.query;
  const rows = db.all(`${projectSelect} GROUP BY p.id ORDER BY p.created_at DESC, p.id DESC`).map(serializeProject);
  const normalizedQuery = typeof q === 'string' ? q.trim().toLocaleLowerCase('es') : '';
  const filtered = rows.filter((project) => {
    const categoryMatch = typeof category !== 'string' || !category || project.category.toLocaleLowerCase('es') === category.toLocaleLowerCase('es');
    const technologyMatch = typeof technology !== 'string' || !technology || project.technologies.some((item) => item.toLocaleLowerCase('es') === technology.toLocaleLowerCase('es'));
    const textMatch = !normalizedQuery || [project.title, project.description, project.category, ...project.technologies]
      .some((value) => value.toLocaleLowerCase('es').includes(normalizedQuery));
    return categoryMatch && technologyMatch && textMatch;
  });
  return res.json({ projects: filtered, total: filtered.length });
});

app.get('/api/projects/:id', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identificador de proyecto inválido.' });
  const row = findProject(id);
  if (!row) return res.status(404).json({ error: 'No encontramos ese proyecto.' });
  return res.json({ project: serializeProject(row) });
});

app.post('/api/projects/:id/owner/verify', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identificador de proyecto inválido.' });
  const result = ownerKeySchema.safeParse(req.body || {});
  if (!result.success) return res.status(400).json({ error: 'La clave privada no tiene un formato válido.' });
  const row = db.get('SELECT owner_key_hash FROM projects WHERE id = ?', [id]);
  if (!row) return res.status(404).json({ error: 'No encontramos ese proyecto.' });
  if (!ownerKeyMatchesToken(result.data.ownerKey, row.owner_key_hash)) return res.status(403).json({ error: 'La clave privada no coincide con este proyecto.' });
  return res.json({ valid: true });
});

app.post('/api/projects', projectUpload.fields([{ name: 'cover', maxCount: 1 }, { name: 'media', maxCount: 1 }]), async (req, res, next) => {
  const result = projectSchema.safeParse(req.body || {});
  if (sendProjectValidation(result, res)) return;
  const { coverFile, mediaFile } = getUploadedFiles(req);
  if (rejectOversizedCover(coverFile, res)) return;

  const project = result.data;
  const savedFiles = [];
  const ownerKey = randomBytes(32).toString('base64url');
  try {
    if (coverFile) await verifyFileSignature(coverFile, 'cover');
    if (mediaFile) await verifyFileSignature(mediaFile, 'media');
    const cover = coverFile ? storeUpload(coverFile) : null;
    const media = mediaFile ? storeUpload(mediaFile) : null;
    if (cover) savedFiles.push(cover.path);
    if (media) savedFiles.push(media.path);
    const created = db.run(`
      INSERT INTO projects (title, description, category, technologies, image_url, media_url, demo_url, repo_url, contact_name, contact_email, contact_url, owner_key_hash)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      project.title,
      project.description,
      project.category,
      JSON.stringify(project.technologies),
      cover?.url || project.imageUrl || '',
      media?.url || project.mediaUrl || '',
      project.demoUrl || '',
      project.repoUrl || '',
      project.contactName,
      project.contactEmail,
      project.contactUrl || '',
      digest(ownerKey),
    ]);
    const saved = serializeProject(findProject(created.lastInsertRowid));
    return res.status(201).json({ project: saved, ownerKey, message: 'Proyecto registrado. Guarda tu clave privada para poder administrarlo.' });
  } catch (error) {
    for (const path of savedFiles) if (existsSync(path)) unlinkSync(path);
    return next(error);
  }
});

app.put('/api/projects/:id', projectUpload.fields([{ name: 'cover', maxCount: 1 }, { name: 'media', maxCount: 1 }]), async (req, res, next) => {
  const target = ensureExistingProject(req.params.id, res);
  if (!target) return;
  const { id, row } = target;
  if (rejectNonOwner(req, row, res)) return;
  const result = projectSchema.safeParse(req.body || {});
  if (sendProjectValidation(result, res)) return;
  const { coverFile, mediaFile } = getUploadedFiles(req);
  if (rejectOversizedCover(coverFile, res)) return;

  const project = result.data;
  const savedFiles = [];
  try {
    if (coverFile) await verifyFileSignature(coverFile, 'cover');
    if (mediaFile) await verifyFileSignature(mediaFile, 'media');
    const cover = coverFile ? storeUpload(coverFile) : null;
    const media = mediaFile ? storeUpload(mediaFile) : null;
    if (cover) savedFiles.push(cover.path);
    if (media) savedFiles.push(media.path);
    const imageUrl = cover?.url ?? (project.imageUrl || row.image_url);
    const mediaUrl = media?.url ?? (project.mediaUrl || row.media_url);

    db.run(`
      UPDATE projects SET title = ?, description = ?, category = ?, technologies = ?, image_url = ?, media_url = ?, demo_url = ?, repo_url = ?, contact_name = ?, contact_email = ?, contact_url = ?
      WHERE id = ?
    `, [
      project.title,
      project.description,
      project.category,
      JSON.stringify(project.technologies),
      imageUrl,
      mediaUrl,
      project.demoUrl || '',
      project.repoUrl || '',
      project.contactName,
      project.contactEmail,
      project.contactUrl || '',
      id,
    ]);
    if (row.image_url !== imageUrl) removeStoredUpload(row.image_url);
    if (row.media_url !== mediaUrl) removeStoredUpload(row.media_url);
    return res.json({ project: serializeProject(findProject(id)), message: 'Proyecto actualizado.' });
  } catch (error) {
    for (const path of savedFiles) if (existsSync(path)) unlinkSync(path);
    return next(error);
  }
});

app.delete('/api/projects/:id', (req, res) => {
  const target = ensureExistingProject(req.params.id, res);
  if (!target) return;
  const { id, row } = target;
  if (rejectNonOwner(req, row, res)) return;
  db.run('DELETE FROM projects WHERE id = ?', [id]);
  removeStoredUpload(row.image_url);
  removeStoredUpload(row.media_url);
  return res.status(204).end();
});

app.post('/api/projects/:id/ratings', (req, res) => {
  const id = parseId(req.params.id);
  if (!id) return res.status(400).json({ error: 'Identificador de proyecto inválido.' });
  if (!db.get('SELECT id FROM projects WHERE id = ?', [id])) return res.status(404).json({ error: 'No encontramos ese proyecto.' });
  const result = ratingSchema.safeParse(req.body || {});
  if (!result.success) {
    return res.status(400).json({
      error: 'La calificación debe ser de 1 a 5 estrellas.',
      fields: result.error.issues.map(({ path, message }) => ({ field: path.join('.'), message })),
    });
  }
  const { rating, voterId } = result.data;
  db.run(`
    INSERT INTO project_ratings (project_id, voter_key_hash, rating) VALUES (?, ?, ?)
    ON CONFLICT(project_id, voter_key_hash) DO UPDATE SET rating = excluded.rating, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ','now')
  `, [id, digest(voterId), rating]);
  const project = serializeProject(findProject(id));
  return res.json({ project, myRating: rating, message: 'Calificación guardada.' });
});

app.use((error, _req, res, _next) => {
  if (error instanceof multer.MulterError) {
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? (error.field === 'cover' ? 'La imagen de portada no puede superar 8 MB.' : 'El archivo multimedia no puede superar 16 MB.')
      : 'No se pudo procesar el archivo. Revisa el formato y vuelve a intentarlo.';
    const field = error.field === 'cover' ? 'coverFile' : error.field === 'media' ? 'mediaFile' : undefined;
    return res.status(400).json({
      error: message,
      ...(field ? { fields: [{ field, message }] } : {}),
    });
  }
  if (error?.status === 400) {
    const field = error.field === 'cover' ? 'coverFile' : error.field === 'media' ? 'mediaFile' : undefined;
    return res.status(400).json({
      error: error.message,
      ...(field ? { fields: [{ field, message: error.message }] } : {}),
    });
  }
  if (error instanceof SyntaxError && 'body' in error) return res.status(400).json({ error: 'El cuerpo de la solicitud no es JSON válido.' });
  console.error(error);
  return res.status(500).json({ error: 'Ocurrió un error inesperado. Inténtalo de nuevo.' });
});

const server = app.listen(port, '0.0.0.0', () => console.log(`Proyecta API lista en http://localhost:${port}`));

function close() {
  server.close(() => {
    db.close();
    process.exit(0);
  });
}
process.on('SIGINT', close);
process.on('SIGTERM', close);
