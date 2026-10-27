import type { ApiFieldError, Project, ProjectFilters, ProjectInput } from './types';

export class ApiError extends Error {
  fields?: ApiFieldError[];
  constructor(message: string, fields?: ApiFieldError[]) {
    super(message);
    this.name = 'ApiError';
    this.fields = fields;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(init?.headers);
    const isFormData = typeof FormData !== 'undefined' && init?.body instanceof FormData;
    if (init?.body && !isFormData) headers.set('Content-Type', 'application/json');
    response = await fetch(path, { ...init, headers });
  } catch {
    throw new ApiError('No pudimos conectar con el servidor. Comprueba que la API esté iniciada.');
  }
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new ApiError(body.error || 'No se pudo completar la solicitud.', body.fields);
  return body as T;
}

function makeProjectBody(project: ProjectInput, files: ProjectFiles): BodyInit {
  if (!files.cover && !files.media) return JSON.stringify(project);
  const form = new FormData();
  for (const [key, value] of Object.entries(project)) {
    form.append(key, Array.isArray(value) ? value.join(', ') : String(value ?? ''));
  }
  if (files.cover) form.append('cover', files.cover, files.cover.name);
  if (files.media) form.append('media', files.media, files.media.name);
  return form;
}

export type ProjectFiles = { cover?: File | null; media?: File | null };

export async function listProjects(filters: Partial<ProjectFilters> = {}) {
  const params = new URLSearchParams();
  if (filters.category) params.set('category', filters.category);
  if (filters.technology) params.set('technology', filters.technology);
  if (filters.q?.trim()) params.set('q', filters.q.trim());
  const query = params.size ? `?${params.toString()}` : '';
  return request<{ projects: Project[]; total: number }>(`/api/projects${query}`);
}

export async function getProject(id: number) {
  return request<{ project: Project }>(`/api/projects/${id}`);
}

export async function verifyOwnerKey(id: number, ownerKey: string) {
  return request<{ valid: true }>(`/api/projects/${id}/owner/verify`, {
    method: 'POST',
    body: JSON.stringify({ ownerKey }),
  });
}

export async function createProject(project: ProjectInput, files: ProjectFiles = {}) {
  return request<{ project: Project; ownerKey: string; message: string }>('/api/projects', {
    method: 'POST',
    body: makeProjectBody(project, files),
  });
}

export async function updateProject(id: number, ownerKey: string, project: ProjectInput, files: ProjectFiles = {}) {
  return request<{ project: Project; message: string }>(`/api/projects/${id}`, {
    method: 'PUT',
    headers: { Authorization: `Bearer ${ownerKey}` },
    body: makeProjectBody(project, files),
  });
}

export async function deleteProject(id: number, ownerKey: string) {
  return request<void>(`/api/projects/${id}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${ownerKey}` },
  });
}

export async function rateProject(id: number, rating: number, voterId: string) {
  return request<{ project: Project; myRating: number; message: string }>(`/api/projects/${id}/ratings`, {
    method: 'POST',
    body: JSON.stringify({ rating, voterId }),
  });
}
