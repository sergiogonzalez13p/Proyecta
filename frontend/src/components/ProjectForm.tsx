import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { ArrowUpRight, Check, ChevronDown, LoaderCircle, X } from 'lucide-react';
import { ApiError, createProject, updateProject } from '../api';
import { useDialogFocus } from '../hooks/useDialogFocus';
import type { ApiFieldError, Project, ProjectInput } from '../types';

const categories = ['IA y datos', 'Web', 'Movilidad', 'IoT', 'Impacto', 'Educación', 'Otro'];
const allowedCoverTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const allowedMediaTypes = new Set([
  'video/mp4', 'video/webm', 'video/quicktime', 'audio/mpeg', 'audio/mp4', 'audio/x-m4a',
  'audio/wav', 'audio/x-wav', 'audio/wave', 'audio/ogg', 'application/ogg', 'application/pdf',
]);
const maxCoverBytes = 8 * 1024 * 1024;
const maxMediaBytes = 16 * 1024 * 1024;

type Values = {
  title: string; description: string; category: string; technologies: string;
  imageUrl: string; mediaUrl: string; demoUrl: string; repoUrl: string;
  contactName: string; contactEmail: string;
};
const initial: Values = {
  title: '', description: '', category: '', technologies: '', imageUrl: '', mediaUrl: '', demoUrl: '', repoUrl: '', contactName: '', contactEmail: '',
};

type Props = {
  open: boolean;
  onClose: () => void;
  projectToEdit: Project | null;
  ownerKey?: string;
  onSaved: (project: Project, ownerKey?: string) => void;
};
type FileField = 'coverFile' | 'mediaFile';

export default function ProjectForm({ open, onClose, projectToEdit, ownerKey, onSaved }: Props) {
  const [values, setValues] = useState<Values>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState('');
  const [saving, setSaving] = useState(false);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [fileInputVersion, setFileInputVersion] = useState(0);
  const dialogRef = useRef<HTMLElement | null>(null);
  useDialogFocus(dialogRef, open, onClose, !saving);

  useEffect(() => {
    if (!open) return;
    setValues(projectToEdit ? {
      title: projectToEdit.title,
      description: projectToEdit.description,
      category: projectToEdit.category,
      technologies: projectToEdit.technologies.join(', '),
      imageUrl: projectToEdit.imageUrl.startsWith('/uploads/') ? '' : projectToEdit.imageUrl,
      mediaUrl: projectToEdit.mediaUrl.startsWith('/uploads/') ? '' : projectToEdit.mediaUrl,
      demoUrl: projectToEdit.demoUrl,
      repoUrl: projectToEdit.repoUrl,
      contactName: projectToEdit.contactName,
      contactEmail: projectToEdit.contactEmail,
    } : initial);
    setErrors({});
    setApiError('');
    setCoverFile(null);
    setMediaFile(null);
    setFileInputVersion((current) => current + 1);
  }, [open, projectToEdit?.id]);

  if (!open) return null;
  const update = (field: keyof Values, value: string) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: '' }));
    setApiError('');
  };

  function updateFile(field: FileField, file: File | null) {
    if (field === 'coverFile') setCoverFile(file);
    else setMediaFile(file);
    setErrors((current) => ({ ...current, [field]: '' }));
    setApiError('');
  }

  function clearFile(field: FileField) {
    updateFile(field, null);
    setFileInputVersion((current) => current + 1);
  }

  function validate() {
    const next: Record<string, string> = {};
    if (values.title.trim().length < 5) next.title = 'Usa al menos 5 caracteres.';
    else if (values.title.trim().length > 80) next.title = 'Máximo 80 caracteres.';
    if (values.description.trim().length < 20) next.description = 'Cuéntanos un poco más (mínimo 20 caracteres).';
    else if (values.description.trim().length > 1200) next.description = 'Máximo 1200 caracteres.';
    if (!values.category) next.category = 'Selecciona una categoría.';
    const tech = values.technologies.split(',').map((item) => item.trim()).filter(Boolean);
    if (tech.length === 0) next.technologies = 'Añade al menos una tecnología.';
    else if (tech.length > 8) next.technologies = 'Puedes incluir hasta 8 tecnologías.';
    if (values.contactName.trim().length < 2) next.contactName = 'Indica un nombre de contacto.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.contactEmail.trim())) next.contactEmail = 'Escribe un correo válido.';
    if (coverFile && !allowedCoverTypes.has(coverFile.type)) next.coverFile = 'Usa una imagen JPG, PNG, WEBP o GIF.';
    else if (coverFile && coverFile.size > maxCoverBytes) next.coverFile = 'La portada no puede superar 8 MB.';
    if (mediaFile && !allowedMediaTypes.has(mediaFile.type)) next.mediaFile = 'Usa un video, audio o PDF en un formato permitido.';
    else if (mediaFile && mediaFile.size > maxMediaBytes) next.mediaFile = 'El archivo multimedia no puede superar 16 MB.';
    for (const field of ['imageUrl', 'mediaUrl', 'demoUrl', 'repoUrl'] as const) {
      if ((field === 'imageUrl' && coverFile) || (field === 'mediaUrl' && mediaFile)) continue;
      const value = values[field].trim();
      if (!value) continue;
      try { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol)) throw new Error(); }
      catch { next[field] = 'Escribe un enlace completo con https://.'; }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validate()) return;
    if (projectToEdit && !ownerKey) {
      setApiError('No encontramos la clave privada de este proyecto en este navegador.');
      return;
    }
    setSaving(true);
    setApiError('');
    try {
      const input: ProjectInput = {
        title: values.title.trim(),
        description: values.description.trim(),
        category: values.category,
        technologies: values.technologies.split(',').map((item) => item.trim()).filter(Boolean),
        imageUrl: values.imageUrl.trim(),
        mediaUrl: values.mediaUrl.trim(),
        demoUrl: values.demoUrl.trim(),
        repoUrl: values.repoUrl.trim(),
        contactName: values.contactName.trim(),
        contactEmail: values.contactEmail.trim(),
        contactUrl: projectToEdit?.contactUrl || '',
      };
      let savedProject: Project;
      let newOwnerKey: string | undefined;
      if (projectToEdit && ownerKey) {
        const result = await updateProject(projectToEdit.id, ownerKey, input, { cover: coverFile, media: mediaFile });
        savedProject = result.project;
      } else {
        const result = await createProject(input, { cover: coverFile, media: mediaFile });
        savedProject = result.project;
        newOwnerKey = result.ownerKey;
      }
      setValues(initial);
      setErrors({});
      setCoverFile(null);
      setMediaFile(null);
      setFileInputVersion((current) => current + 1);
      onSaved(savedProject, newOwnerKey);
    } catch (error) {
      if (error instanceof ApiError) {
        setApiError(error.message);
        if (error.fields?.length) setErrors(Object.fromEntries(error.fields.map((field: ApiFieldError) => [field.field, field.message])));
      } else setApiError('No pudimos guardar el proyecto. Inténtalo de nuevo.');
    } finally { setSaving(false); }
  }

  const fieldError = (name: keyof Values) => errors[name] ? <span className="field-error" id={`${name}-error`}>{errors[name]}</span> : null;
  const described = (name: keyof Values) => errors[name] ? { 'aria-invalid': true as const, 'aria-describedby': `${name}-error` } : {};
  const fileControlProps = (field: FileField) => ({
    'aria-invalid': Boolean(errors[field]),
    'aria-describedby': errors[field] ? `${field}-error` : undefined,
  });

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} className="form-dialog" role="dialog" aria-modal="true" aria-labelledby="form-title">
        <button className="dialog-close" data-autofocus type="button" onClick={onClose} disabled={saving} aria-label="Cerrar formulario"><X size={19} /></button>
        <div className="form-dialog-head">
          <div className="form-kicker"><span className="tiny-spark" /> {projectToEdit ? 'EDICIÓN DEL PROYECTO' : 'CONVOCATORIA ABIERTA'}</div>
          <h2 id="form-title">{projectToEdit ? <>Cuida la siguiente<br /><em>etapa de tu idea.</em></> : <>Tu idea merece <em>un escenario.</em></>}</h2>
          <p>{projectToEdit ? 'Actualiza los datos, enlaces o archivos de tu proyecto.' : 'Comparte lo que estás creando. Cada proyecto empieza con una primera mirada.'}</p>
        </div>
        <form onSubmit={submit} noValidate>
          <div className="form-grid">
            <label className="form-field full-field">Nombre del proyecto <span className="required-mark">*</span>
              <input value={values.title} onChange={(event) => update('title', event.target.value)} placeholder="Ej. Barrio solar" maxLength={80} {...described('title')} />
              {fieldError('title')}
            </label>
            <label className="form-field">Categoría <span className="required-mark">*</span>
              <span className="select-wrap"><select value={values.category} onChange={(event) => update('category', event.target.value)} {...described('category')}>
                <option value="">Elige una categoría</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select><ChevronDown size={15} /></span>
              {fieldError('category')}
            </label>
            <label className="form-field">Tecnologías <span className="required-mark">*</span>
              <input value={values.technologies} onChange={(event) => update('technologies', event.target.value)} placeholder="React, Python, Arduino…" {...described('technologies')} />
              {fieldError('technologies')}
              <span className="field-hint">Separa cada tecnología con una coma.</span>
            </label>
            <label className="form-field full-field">¿Qué hace tu proyecto? <span className="required-mark">*</span>
              <textarea value={values.description} onChange={(event) => update('description', event.target.value)} placeholder="Cuéntanos qué problema resuelve y a quién ayuda…" maxLength={1200} rows={3} {...described('description')} />
              <span className="form-meta">{values.description.length}/1200</span>{fieldError('description')}
            </label>
            <div className="form-divider full-field"><span>UN POCO MÁS DE CONTEXTO</span></div>
            <label className="form-field full-field">Imagen de portada (URL opcional)
              <input type="url" value={values.imageUrl} onChange={(event) => update('imageUrl', event.target.value)} placeholder="https://…" {...described('imageUrl')} />
              {fieldError('imageUrl')}
              <span className="field-hint">{projectToEdit?.imageUrl.startsWith('/uploads/') ? 'La imagen subida actual se conserva si dejas este campo vacío.' : 'O selecciona una imagen para subirla.'} Si cargas un archivo nuevo, reemplazará la imagen existente.</span>
            </label>
            <div className="file-field full-field">
              <label className="form-field" htmlFor="cover-file">Archivo de portada
                <input key={`cover-${fileInputVersion}`} id="cover-file" className="file-control" type="file" accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif" onChange={(event: ChangeEvent<HTMLInputElement>) => updateFile('coverFile', event.target.files?.[0] || null)} {...fileControlProps('coverFile')} />
                <span className="field-hint">JPG, PNG, WEBP o GIF · máximo 8 MB.</span>
              </label>
              {coverFile && <div className="file-status" aria-live="polite"><span>Seleccionado: {coverFile.name}</span><button className="file-clear" type="button" onClick={() => clearFile('coverFile')}>Quitar archivo</button></div>}
              {errors.coverFile && <span className="field-error" id="coverFile-error">{errors.coverFile}</span>}
            </div>
            <label className="form-field">Demo o sitio web
              <input type="url" value={values.demoUrl} onChange={(event) => update('demoUrl', event.target.value)} placeholder="https://…" {...described('demoUrl')} />
              {fieldError('demoUrl')}
            </label>
            <label className="form-field">Repositorio
              <input type="url" value={values.repoUrl} onChange={(event) => update('repoUrl', event.target.value)} placeholder="https://github.com/…" {...described('repoUrl')} />
              {fieldError('repoUrl')}
            </label>
            <label className="form-field full-field">Video o enlace multimedia (URL opcional)
              <input type="url" value={values.mediaUrl} onChange={(event) => update('mediaUrl', event.target.value)} placeholder="https://…" {...described('mediaUrl')} />
              {fieldError('mediaUrl')}
              {projectToEdit?.mediaUrl.startsWith('/uploads/') && <span className="field-hint">El medio subido actual se conserva si dejas este campo vacío; un nuevo archivo lo reemplaza.</span>}
            </label>
            <div className="file-field full-field">
              <label className="form-field" htmlFor="media-file">Subir archivo multimedia
                <input key={`media-${fileInputVersion}`} id="media-file" className="file-control" type="file" accept="video/mp4,video/webm,video/quicktime,audio/mpeg,audio/mp4,audio/x-m4a,audio/wav,audio/x-wav,audio/wave,audio/ogg,application/ogg,application/pdf,.mp4,.webm,.mov,.mp3,.m4a,.wav,.ogg,.pdf" onChange={(event: ChangeEvent<HTMLInputElement>) => updateFile('mediaFile', event.target.files?.[0] || null)} {...fileControlProps('mediaFile')} />
                <span className="field-hint">MP4, WEBM, MOV, MP3, M4A, WAV, OGG o PDF · máximo 16 MB.</span>
              </label>
              {mediaFile && <div className="file-status" aria-live="polite"><span>Seleccionado: {mediaFile.name}</span><button className="file-clear" type="button" onClick={() => clearFile('mediaFile')}>Quitar archivo</button></div>}
              {errors.mediaFile && <span className="field-error" id="mediaFile-error">{errors.mediaFile}</span>}
            </div>
            <div className="form-divider full-field"><span>PERSONA DE CONTACTO</span></div>
            <label className="form-field">Nombre <span className="required-mark">*</span>
              <input value={values.contactName} onChange={(event) => update('contactName', event.target.value)} placeholder="Tu nombre o equipo" {...described('contactName')} />
              {fieldError('contactName')}
            </label>
            <label className="form-field">Correo <span className="required-mark">*</span>
              <input type="email" autoComplete="email" value={values.contactEmail} onChange={(event) => update('contactEmail', event.target.value)} placeholder="tuusuario@gmail.com" {...described('contactEmail')} />
              {fieldError('contactEmail')}
              <span className="field-hint">Puedes usar tu Gmail personal; no necesitas correo institucional.</span>
            </label>
          </div>
          {apiError && <div className="form-api-error" role="alert">{apiError}</div>}
          <div className="form-actions">
            <span className="privacy-note">{projectToEdit ? 'Los cambios se guardan en SQLite; la clave sigue en este navegador.' : 'Los archivos se guardan en backend/uploads y tu clave se conserva localmente.'}</span>
            <button className="button button-lime form-submit" type="submit" disabled={saving}>
              {saving ? <><LoaderCircle className="spin" size={16} /> Guardando</> : <><Check size={16} /> {projectToEdit ? 'Guardar cambios' : 'Enviar proyecto'} <ArrowUpRight size={15} /></>}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
