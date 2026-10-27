import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowDownRight, ArrowUpRight, Github, Mail, Pencil, Trash2, X } from 'lucide-react';
import type { Project } from '../types';
import { useDialogFocus } from '../hooks/useDialogFocus';
import RatingStars from './RatingStars';

type Props = {
  project: Project | null;
  onClose: () => void;
  isOwner: boolean;
  myRating: number;
  ratingBusy: boolean;
  onRate: (projectId: number, rating: number) => void;
  onClaim: (projectId: number, ownerKey: string) => Promise<void>;
  onEdit: (project: Project) => void;
  onDelete: (projectId: number) => Promise<void>;
};

export default function ProjectDialog({ project, onClose, isOwner, myRating, ratingBusy, onRate, onClaim, onEdit, onDelete }: Props) {
  const dialogRef = useRef<HTMLElement | null>(null);
  const claimInputRef = useRef<HTMLInputElement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [claimOpen, setClaimOpen] = useState(false);
  const [claimKey, setClaimKey] = useState('');
  const [claimBusy, setClaimBusy] = useState(false);
  const [claimError, setClaimError] = useState('');
  useDialogFocus(dialogRef, Boolean(project), onClose, !deleting);

  useEffect(() => {
    setConfirmDelete(false);
    setDeleteError('');
    setDeleting(false);
    setClaimOpen(false);
    setClaimKey('');
    setClaimError('');
  }, [project?.id]);

  useEffect(() => {
    if (claimOpen) claimInputRef.current?.focus({ preventScroll: true });
  }, [claimOpen]);

  if (!project) return null;
  const projectId = project.id;

  async function restoreOwnerKey(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setClaimBusy(true);
    setClaimError('');
    try {
      await onClaim(projectId, claimKey.trim());
      setClaimKey('');
      setClaimOpen(false);
    } catch (error) {
      setClaimError(error instanceof Error ? error.message : 'No pudimos verificar la clave.');
    } finally { setClaimBusy(false); }
  }

  async function confirmProjectDeletion() {
    setDeleting(true);
    setDeleteError('');
    try {
      await onDelete(projectId);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : 'No pudimos eliminar el proyecto.');
      setDeleting(false);
    }
  }

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget && !deleting) onClose(); }}>
      <section ref={dialogRef} tabIndex={-1} className="detail-dialog" role="dialog" aria-modal="true" aria-labelledby="detail-title">
        <button className="dialog-close" data-autofocus type="button" onClick={onClose} aria-label="Cerrar detalle"><X size={19} /></button>
        <div className="detail-cover">
          <img src={project.imageUrl || 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1500&q=85'} alt={`Portada de ${project.title}`} />
          <span className="detail-label">PROYECTO · {String(project.id).padStart(2, '0')}</span>
        </div>
        <div className="detail-body">
          <div className="detail-heading">
            <div><span className="eyebrow">{project.category}</span><h2 id="detail-title">{project.title}</h2></div>
            <span className="availability-dot">Disponible para adopción</span>
          </div>
          <p className="detail-description">{project.description}</p>
          <div className="detail-section">
            <span className="detail-caption">HECHO CON</span>
            <div className="tech-row">{project.technologies.map((tech) => <span className="tech-chip" key={tech}>{tech}</span>)}</div>
          </div>
          <div className="detail-section">
            <span className="detail-caption">VALORACIÓN DE LA COMUNIDAD</span>
            <RatingStars average={project.ratingAverage} count={project.ratingCount} myRating={myRating} onRate={(rating) => onRate(projectId, rating)} disabled={ratingBusy} />
          </div>
          {(project.mediaUrl || project.demoUrl || project.repoUrl) && <div className="detail-section">
            <span className="detail-caption">ENLACES DEL PROYECTO</span>
            <div className="detail-links">
              {project.demoUrl && <a href={project.demoUrl} target="_blank" rel="noreferrer">Explorar demo <ArrowUpRight size={15} /></a>}
              {project.mediaUrl && <a href={project.mediaUrl} target="_blank" rel="noreferrer">Ver multimedia <ArrowUpRight size={15} /></a>}
              {project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noreferrer"><Github size={15} /> Código fuente <ArrowUpRight size={15} /></a>}
            </div>
          </div>}
          <div className="detail-contact">
            <div className="contact-avatar">{project.contactName.slice(0, 1).toUpperCase()}</div>
            <div className="contact-copy"><span className="detail-caption">HABLEMOS CON</span><strong>{project.contactName}</strong></div>
            <a className="contact-action" href={`mailto:${project.contactEmail}?subject=${encodeURIComponent(`Quiero conocer ${project.title}`)}`} aria-label={`Contactar a ${project.contactName}`}><Mail size={17} /> <span>Contactar</span> <ArrowDownRight size={15} /></a>
          </div>
          {isOwner && <section className="owner-panel" aria-label="Administración de tu proyecto">
            <div><span className="detail-caption">TU PROYECTO · CLAVE DE ESTE NAVEGADOR</span><p>Solo este navegador tiene la clave privada para administrarlo.</p></div>
            <div className="owner-actions">
              <button className="owner-edit" type="button" onClick={() => onEdit(project)} disabled={deleting}><Pencil size={15} /> Editar proyecto</button>
              {!confirmDelete && <button className="owner-delete" type="button" onClick={() => setConfirmDelete(true)} disabled={deleting}><Trash2 size={15} /> Eliminar</button>}
            </div>
            {confirmDelete && <div className="delete-confirm" role="alert">
              <span>¿Eliminar “{project.title}” de forma permanente? También se borrarán sus calificaciones y archivos subidos.</span>
              <div><button type="button" onClick={() => setConfirmDelete(false)} disabled={deleting}>Cancelar</button><button className="delete-confirm-action" type="button" onClick={confirmProjectDeletion} disabled={deleting}>{deleting ? 'Eliminando…' : 'Sí, eliminar proyecto'}</button></div>
            </div>}
            {deleteError && <p className="owner-error" role="alert">{deleteError}</p>}
          </section>}
          {!isOwner && project.ownershipEnabled && <section className="owner-claim" aria-label="Recuperar acceso del propietario">
            {!claimOpen
              ? <button className="owner-claim-toggle" type="button" onClick={() => setClaimOpen(true)}>¿Es tu proyecto? Recuperar clave privada</button>
              : <form onSubmit={restoreOwnerKey}>
                <label className="detail-caption" htmlFor="owner-key-input">PEGA AQUÍ LA CLAVE DEL ARCHIVO DE RESPALDO</label>
                <input ref={claimInputRef} id="owner-key-input" type="password" autoComplete="off" value={claimKey} onChange={(event) => setClaimKey(event.target.value)} minLength={43} maxLength={43} required />
                <div className="owner-claim-actions"><button type="button" onClick={() => { setClaimOpen(false); setClaimKey(''); setClaimError(''); }}>Cancelar</button><button type="submit" className="owner-edit" disabled={claimBusy}>{claimBusy ? 'Verificando…' : 'Verificar clave'}</button></div>
                {claimError && <p className="owner-error" role="alert">{claimError}</p>}
                <p className="field-hint">Abre tu archivo `proyecta-clave-ID.txt` y copia el texto que aparece después de “Clave:”.</p>
              </form>}
          </section>}
        </div>
      </section>
    </div>
  );
}
