import { ArrowUpRight, MoveUpRight, Star } from 'lucide-react';
import type { Project } from '../types';

type Props = { project: Project; index: number; onOpen: (project: Project) => void };

export default function ProjectCard({ project, index, onOpen }: Props) {
  const fallback = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80';
  return (
    <article className={`project-card ${index === 0 ? 'project-card--featured' : ''}`}>
      <button className="card-open" type="button" onClick={() => onOpen(project)} aria-label={`Ver proyecto ${project.title}`}>
        <div className="project-image-wrap">
          <img
            className="project-image"
            src={project.imageUrl || fallback}
            alt={`Imagen del proyecto ${project.title}`}
            loading="lazy"
            onError={(event) => { event.currentTarget.src = fallback; }}
          />
          <div className="image-shade" />
          <span className="project-index">P—{String(project.id).padStart(2, '0')}</span>
          <span className="image-arrow"><ArrowUpRight size={18} strokeWidth={1.8} /></span>
          <span className="category-tag">{project.category}</span>
        </div>
        <div className="project-card-copy">
          <div className="card-title-row">
            <div>
              <h3>{project.title}</h3>
              <p className="project-description">{project.description}</p>
            </div>
            <MoveUpRight className="card-direction" size={19} />
          </div>
          <div className="tech-row" aria-label="Tecnologías">
            {project.technologies.slice(0, 4).map((tech) => <span className="tech-chip" key={tech}>{tech}</span>)}
            {project.technologies.length > 4 && <span className="tech-chip">+{project.technologies.length - 4}</span>}
          </div>
          <div className="card-rating" aria-label={`${project.ratingAverage.toFixed(1)} de 5 estrellas, ${project.ratingCount} calificaciones`}>
            <Star size={13} fill={project.ratingCount ? 'currentColor' : 'none'} />
            <strong>{project.ratingAverage.toFixed(1)}</strong>
            <span>({project.ratingCount})</span>
          </div>
          <div className="card-contact-row">
            <span className="contact-mini-avatar" aria-hidden="true">{project.contactName.slice(0, 1).toUpperCase()}</span>
            <span className="contact-mini-name">{project.contactName}</span>
            <span className="contact-mini-link">CONOCE AL EQUIPO ↗</span>
          </div>
        </div>
      </button>
    </article>
  );
}
