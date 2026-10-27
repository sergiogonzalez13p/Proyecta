import assert from 'node:assert/strict';
import { createServer } from 'node:net';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { createRequire } from 'node:module';
import initSqlJs from 'sql.js';

const here = dirname(fileURLToPath(import.meta.url));
const backendRoot = resolve(here, '..');
const require = createRequire(import.meta.url);
const samplePng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/fHQAAAAASUVORK5CYII=', 'base64');

async function findPort() {
  const reservation = createServer();
  await new Promise((resolveListen, reject) => {
    reservation.once('error', reject);
    reservation.listen(0, '127.0.0.1', resolveListen);
  });
  const address = reservation.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  await new Promise((resolveClose, reject) => reservation.close((error) => error ? reject(error) : resolveClose()));
  return port;
}

function startApi({ port, databasePath, uploadsDirectory }) {
  return spawn(process.execPath, ['src/server.js'], {
    cwd: backendRoot,
    env: {
      ...process.env,
      PORT: String(port),
      FRONTEND_ORIGIN: 'http://localhost:3000',
      DATABASE_PATH: databasePath,
      UPLOADS_DIRECTORY: uploadsDirectory,
    },
    stdio: 'ignore',
  });
}

async function waitForApi(child, baseUrl) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) throw new Error(`El backend terminó antes de iniciar (código ${child.exitCode}).`);
    try {
      const response = await fetch(`${baseUrl}/api/health`);
      if (response.ok) return;
    } catch {
      await new Promise((resolveWait) => setTimeout(resolveWait, 100));
    }
  }
  child.kill('SIGTERM');
  throw new Error('El backend no respondió a tiempo.');
}

async function stopApi(child) {
  if (child.exitCode !== null) return;
  const exited = new Promise((resolveExit) => child.once('exit', resolveExit));
  child.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolveWait) => setTimeout(resolveWait, 3000))]);
  if (child.exitCode === null) child.kill('SIGKILL');
}

const projectPayload = (title = 'Laboratorio de ideas') => ({
  title,
  description: 'Una plataforma para conectar ideas con prototipos tecnológicos que puedan crecer.',
  category: 'Educación',
  technologies: ['React', 'Node.js'],
  imageUrl: '',
  mediaUrl: '',
  demoUrl: '',
  repoUrl: '',
  contactName: 'Equipo Proyecta',
  contactEmail: 'aprendiz@gmail.com',
  contactUrl: '',
});

function asForm(payload) {
  const form = new FormData();
  for (const [key, value] of Object.entries(payload)) form.append(key, Array.isArray(value) ? value.join(', ') : String(value));
  return form;
}

test('API completa: crea, consulta, califica, actualiza con archivos, persiste, protege y elimina', { timeout: 30000 }, async (t) => {
  const temporaryRoot = await mkdtemp(resolve(tmpdir(), 'proyecta-crud-'));
  const databasePath = resolve(temporaryRoot, 'data', 'proyecta.sqlite');
  const uploadsDirectory = resolve(temporaryRoot, 'uploads');
  const port = await findPort();
  const baseUrl = `http://127.0.0.1:${port}`;
  let child = startApi({ port, databasePath, uploadsDirectory });
  t.after(async () => {
    if (child && child.exitCode === null) await stopApi(child);
    await rm(temporaryRoot, { recursive: true, force: true });
  });
  await waitForApi(child, baseUrl);

  const initial = await fetch(`${baseUrl}/api/projects`).then((response) => response.json());
  assert.equal(initial.total, 0, 'una base nueva debe empezar vacía, sin fichas de muestra');

  const createResponse = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(projectPayload()),
  });
  assert.equal(createResponse.status, 201);
  const created = await createResponse.json();
  assert.equal(created.project.contactEmail, 'aprendiz@gmail.com', 'se acepta una dirección Gmail normal');
  assert.equal(created.project.ownershipEnabled, true);
  assert.match(created.ownerKey, /^[A-Za-z0-9_-]{43}$/);
  assert.equal(JSON.stringify(created.project).includes(created.ownerKey), false, 'la API nunca debe incluir la clave en el proyecto serializado');
  const id = created.project.id;
  const ownerKey = created.ownerKey;

  const list = await fetch(`${baseUrl}/api/projects?q=Laboratorio`).then((response) => response.json());
  assert.equal(list.total, 1);
  assert.equal(list.projects[0].id, id);
  const detailResponse = await fetch(`${baseUrl}/api/projects/${id}`);
  assert.equal(detailResponse.status, 200);
  assert.equal((await detailResponse.json()).project.ratingCount, 0);

  const unauthorizedUpdate = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectPayload('Cambio sin permiso')),
  });
  assert.equal(unauthorizedUpdate.status, 403, 'PUT rechaza una petición sin clave de propietario');
  const invalidClaim = await fetch(`${baseUrl}/api/projects/${id}/owner/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerKey: 'A'.repeat(43) }),
  });
  assert.equal(invalidClaim.status, 403);
  const verified = await fetch(`${baseUrl}/api/projects/${id}/owner/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ownerKey }),
  });
  assert.deepEqual(await verified.json(), { valid: true });

  const invalidRating = await fetch(`${baseUrl}/api/projects/${id}/ratings`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: 6, voterId: 'b205373d-2c49-4a96-9482-424ef0a8b507' }),
  });
  assert.equal(invalidRating.status, 400);
  const voterId = 'b205373d-2c49-4a96-9482-424ef0a8b507';
  for (const rating of [3, 5]) {
    const response = await fetch(`${baseUrl}/api/projects/${id}/ratings`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating, voterId }),
    });
    assert.equal(response.status, 200);
  }
  const rated = await fetch(`${baseUrl}/api/projects/${id}`).then((response) => response.json());
  assert.equal(rated.project.ratingCount, 1, 'el mismo navegador modifica su voto en lugar de duplicarlo');
  assert.equal(rated.project.ratingAverage, 5);

  const outsiderResponse = await fetch(`${baseUrl}/api/projects`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(projectPayload('Proyecto ajeno')),
  });
  assert.equal(outsiderResponse.status, 201);
  const outsider = await outsiderResponse.json();
  const stolenUpdate = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${outsider.ownerKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(projectPayload('Cambio sin permiso')),
  });
  assert.equal(stolenUpdate.status, 403, 'la clave de otro proyecto no autoriza una edición');
  const stolenDelete = await fetch(`${baseUrl}/api/projects/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${outsider.ownerKey}` } });
  assert.equal(stolenDelete.status, 403, 'la clave de otro proyecto no autoriza un borrado');

  const spoofedForm = asForm(projectPayload('Portada falsificada'));
  spoofedForm.append('cover', new Blob(['esto no es una imagen'], { type: 'image/png' }), 'fake.png');
  const spoofedResponse = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${ownerKey}` }, body: spoofedForm,
  });
  assert.equal(spoofedResponse.status, 400, 'el servidor detecta una firma falsificada');

  const updateForm = asForm(projectPayload('Laboratorio actualizado'));
  updateForm.append('cover', new Blob([samplePng], { type: 'image/png' }), 'cover.png');
  updateForm.append('media', new Blob(['%PDF-1.4\n1 0 obj\n<<>>\nendobj\n'], { type: 'application/pdf' }), 'guia.pdf');
  const updateResponse = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: 'PUT', headers: { Authorization: `Bearer ${ownerKey}` }, body: updateForm,
  });
  assert.equal(updateResponse.status, 200);
  const updated = await updateResponse.json();
  assert.equal(updated.project.title, 'Laboratorio actualizado');
  assert.equal(updated.project.ratingAverage, 5);
  assert.equal(updated.project.ratingCount, 1);
  assert.match(updated.project.imageUrl, /^\/uploads\/[a-f0-9-]+\.png$/);
  assert.match(updated.project.mediaUrl, /^\/uploads\/[a-f0-9-]+\.pdf$/);
  const imageResponse = await fetch(`${baseUrl}${updated.project.imageUrl}`);
  assert.equal(imageResponse.status, 200);
  assert.equal(Buffer.from(await imageResponse.arrayBuffer()).toString('hex'), samplePng.toString('hex'));
  assert.equal((await fetch(`${baseUrl}${updated.project.mediaUrl}`)).status, 200);

  await stopApi(child);
  child = startApi({ port, databasePath, uploadsDirectory });
  await waitForApi(child, baseUrl);
  const afterRestart = await fetch(`${baseUrl}/api/projects/${id}`).then((response) => response.json());
  assert.equal(afterRestart.project.title, 'Laboratorio actualizado', 'el proyecto persiste al reiniciar Express');
  assert.equal(afterRestart.project.ratingCount, 1);
  assert.equal((await fetch(`${baseUrl}${afterRestart.project.imageUrl}`)).status, 200, 'los adjuntos también persisten tras reiniciar');

  const unauthorizedDelete = await fetch(`${baseUrl}/api/projects/${id}`, { method: 'DELETE' });
  assert.equal(unauthorizedDelete.status, 403, 'DELETE rechaza a quien no tiene la clave');
  const deleted = await fetch(`${baseUrl}/api/projects/${id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${ownerKey}` },
  });
  assert.equal(deleted.status, 204);
  assert.equal((await fetch(`${baseUrl}/api/projects/${id}`)).status, 404);
  assert.equal((await fetch(`${baseUrl}${updated.project.imageUrl}`)).status, 404, 'el borrado retira los archivos del servidor');
  const deleteOutsider = await fetch(`${baseUrl}/api/projects/${outsider.project.id}`, {
    method: 'DELETE', headers: { Authorization: `Bearer ${outsider.ownerKey}` },
  });
  assert.equal(deleteOutsider.status, 204, 'cada clave sí puede eliminar su propio proyecto');

  await stopApi(child);
  child = null;
  const SQL = await initSqlJs({ locateFile: () => require.resolve('sql.js/dist/sql-wasm.wasm') });
  const sql = new SQL.Database(new Uint8Array(await readFile(databasePath)));
  const ratingsLeft = sql.exec('SELECT COUNT(*) FROM project_ratings WHERE project_id = ?', [id])[0]?.values[0]?.[0];
  const projectsLeft = sql.exec('SELECT COUNT(*) FROM projects WHERE id = ?', [id])[0]?.values[0]?.[0];
  const allProjectsLeft = sql.exec('SELECT COUNT(*) FROM projects')[0]?.values[0]?.[0];
  sql.close();
  assert.equal(ratingsLeft, 0, 'al borrar el proyecto también se eliminan sus votos');
  assert.equal(projectsLeft, 0);
  assert.equal(allProjectsLeft, 0);
});
