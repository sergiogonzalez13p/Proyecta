const ownerStorageKey = 'proyecta-owner-keys-v1';
const voterStorageKey = 'proyecta-voter-id-v1';
const ratingsStorageKey = 'proyecta-my-ratings-v1';
let memoryVoterId = '';

export type OwnerKeys = Record<string, string>;

export function readMyRatings(): Record<number, number> {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ratingsStorageKey) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, rating]) => /^\d+$/.test(id) && typeof rating === 'number' && rating >= 1 && rating <= 5)) as Record<number, number>;
  } catch {
    return {};
  }
}

export function saveMyRating(projectId: number, rating: number): void {
  try {
    const current = readMyRatings();
    current[projectId] = rating;
    window.localStorage.setItem(ratingsStorageKey, JSON.stringify(current));
  } catch {
    // La calificación queda guardada en la API aunque el navegador bloquee localStorage.
  }
}

export function removeMyRating(projectId: number): void {
  try {
    const current = readMyRatings();
    delete current[projectId];
    window.localStorage.setItem(ratingsStorageKey, JSON.stringify(current));
  } catch {
    // No se requiere almacenamiento local para completar la eliminación remota.
  }
}

export function readOwnerKeys(): OwnerKeys {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(ownerStorageKey) || '{}');
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return Object.fromEntries(Object.entries(parsed).filter(([id, key]) => /^\d+$/.test(id) && typeof key === 'string' && /^[A-Za-z0-9_-]{43}$/.test(key)));
  } catch {
    return {};
  }
}

export function saveOwnerKey(projectId: number, ownerKey: string): boolean {
  try {
    const current = readOwnerKeys();
    current[String(projectId)] = ownerKey;
    window.localStorage.setItem(ownerStorageKey, JSON.stringify(current));
    return true;
  } catch {
    return false;
  }
}

export function removeOwnerKey(projectId: number): void {
  try {
    const current = readOwnerKeys();
    delete current[String(projectId)];
    window.localStorage.setItem(ownerStorageKey, JSON.stringify(current));
  } catch {
    // El borrado del proyecto sigue siendo válido aunque el navegador no permita limpiar el almacenamiento.
  }
}

export function getVoterId(): string {
  try {
    const existing = window.localStorage.getItem(voterStorageKey);
    if (existing && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(existing)) return existing;
    const created = window.crypto.randomUUID();
    window.localStorage.setItem(voterStorageKey, created);
    return created;
  } catch {
    memoryVoterId ||= window.crypto.randomUUID();
    return memoryVoterId;
  }
}

export function downloadOwnerKey(projectId: number, projectTitle: string, ownerKey: string): void {
  const content = [
    'PROYECTA — CLAVE PRIVADA DEL PROYECTO',
    `Proyecto: ${projectTitle}`,
    `ID: ${projectId}`,
    '',
    `Clave: ${ownerKey}`,
    '',
    'Guarda este archivo en un lugar privado. Sirve para editar y eliminar este proyecto.',
    'La aplicación no almacena una copia recuperable de la clave. No la compartas.',
  ].join('\n');
  const blobUrl = URL.createObjectURL(new Blob([content], { type: 'text/plain;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = blobUrl;
  anchor.download = `proyecta-clave-${projectId}.txt`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 1000);
}
