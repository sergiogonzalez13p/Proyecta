import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDownRight, ArrowRight, ArrowUpRight, Check, ChevronDown, CircleHelp, Compass, Download, Layers3, Plus, Search, Sparkles } from 'lucide-react';
import { deleteProject as deleteProjectRequest, listProjects, rateProject as rateProjectRequest, verifyOwnerKey } from './api';
import ProjectCard from './components/ProjectCard';
import ProjectDialog from './components/ProjectDialog';
import ProjectForm from './components/ProjectForm';
import { downloadOwnerKey, getVoterId, readMyRatings, readOwnerKeys, removeOwnerKey, removeMyRating, saveMyRating, saveOwnerKey, type OwnerKeys } from './lib/ownership';
import type { Project, ProjectFilters } from './types';

const emptyFilters: ProjectFilters = { category: '', technology: '', q: '' };
const wordmark = (
  <a href="#inicio" className="brand-mark" aria-label="Proyecta, ir al inicio">
    <svg className="brand-icon" viewBox="0 0 38 38" fill="none" aria-hidden="true">
      <rect x="1" y="1" width="36" height="36" rx="12" fill="#C7F36B" />
      <path d="M11 27V11h7.6c4.3 0 6.9 2.2 6.9 5.7s-2.6 5.8-6.9 5.8h-3.1V27H11Zm4.5-8.3h3.1c1.6 0 2.5-.6 2.5-1.9 0-1.2-.9-1.8-2.5-1.8h-3.1v3.7Z" fill="#111310" />
      <path d="m23 23 4.5 3-1-5.3" stroke="#111310" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
    <span>proyecta<span className="brand-period">.</span></span>
  </a>
);

type OwnerKeyReminder = { id: number; title: string; key: string };

export default function App() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [catalog, setCatalog] = useState<Project[]>([]);
  const [filters, setFilters] = useState<ProjectFilters>(emptyFilters);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selected, setSelected] = useState<Project | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [notice, setNotice] = useState('');
  const [ownerKeyReminder, setOwnerKeyReminder] = useState<OwnerKeyReminder | null>(null);
  const [ownerKeys, setOwnerKeys] = useState<OwnerKeys>(() => readOwnerKeys());
  const [myRatings, setMyRatings] = useState<Record<number, number>>(() => readMyRatings());
  const [ratingBusy, setRatingBusy] = useState(false);
  const [resultCount, setResultCount] = useState(0);

  const refreshCatalog = useCallback(async () => {
    const result = await listProjects();
    setCatalog(result.projects);
    setResultCount(result.total);
    return result;
  }, []);

  useEffect(() => {
    let active = true;
    listProjects().then((result) => {
      if (!active) return;
      setProjects(result.projects);
      setCatalog(result.projects);
      setResultCount(result.total);
      setLoadError('');
    }).catch((error: Error) => {
      if (active) setLoadError(error.message);
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => {
      listProjects(filters).then((result) => {
        if (!active) return;
        setProjects(result.projects);
        setResultCount(result.total);
        setLoadError('');
      }).catch((error: Error) => { if (active) setLoadError(error.message); })
        .finally(() => { if (active) setLoading(false); });
    }, filters.q ? 220 : 0);
    return () => { active = false; window.clearTimeout(timer); };
  }, [filters]);

  useEffect(() => {
    if (!notice) return;
    const timeout = window.setTimeout(() => setNotice(''), 5000);
    return () => window.clearTimeout(timeout);
  }, [notice]);

  useEffect(() => {
    const handleSearchShortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        window.requestAnimationFrame(() => document.getElementById('project-search')?.focus());
      }
    };
    window.addEventListener('keydown', handleSearchShortcut);
    return () => window.removeEventListener('keydown', handleSearchShortcut);
  }, []);

  const categories = useMemo(() => [...new Set(catalog.map((project) => project.category))].sort((a, b) => a.localeCompare(b, 'es')), [catalog]);
  const technologies = useMemo(() => [...new Set(catalog.flatMap((project) => project.technologies))].sort((a, b) => a.localeCompare(b, 'es')), [catalog]);
  const updateFilter = (key: keyof ProjectFilters, value: string) => setFilters((current) => ({ ...current, [key]: value }));

  function openCreateForm() {
    setEditingProject(null);
    setFormOpen(true);
  }

  function handleSaved(project: Project, newOwnerKey?: string) {
    if (newOwnerKey) {
      saveOwnerKey(project.id, newOwnerKey);
      setOwnerKeys(readOwnerKeys());
      setOwnerKeyReminder({ id: project.id, title: project.title, key: newOwnerKey });
    }
    setCatalog((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    setProjects((current) => [project, ...current.filter((item) => item.id !== project.id)]);
    setFilters(emptyFilters);
    setEditingProject(null);
    setFormOpen(false);
    setSelected(null);
    setNotice(newOwnerKey ? `“${project.title}” ya está en la vitrina.` : `Cambios guardados en “${project.title}”.`);
    void refreshCatalog().catch(() => { /* El resultado ya está visible en esta sesión. */ });
  }

  function handleEdit(project: Project) {
    setSelected(null);
    setEditingProject(project);
    setFormOpen(true);
  }

  async function handleClaim(projectId: number, ownerKey: string) {
    await verifyOwnerKey(projectId, ownerKey);
    if (!saveOwnerKey(projectId, ownerKey)) throw new Error('El navegador no permitió guardar la clave. Habilita el almacenamiento local e inténtalo de nuevo.');
    setOwnerKeys(readOwnerKeys());
    setNotice('Clave verificada y guardada en este navegador. Ya puedes administrar el proyecto.');
  }

  async function handleDelete(projectId: number) {
    const ownerKey = ownerKeys[String(projectId)];
    if (!ownerKey) throw new Error('No encontramos la clave privada de este proyecto en este navegador.');
    await deleteProjectRequest(projectId, ownerKey);
    setProjects((current) => current.filter((project) => project.id !== projectId));
    setCatalog((current) => current.filter((project) => project.id !== projectId));
    setResultCount((current) => Math.max(0, current - 1));
    setFilters(emptyFilters);
    setSelected(null);
    removeOwnerKey(projectId);
    removeMyRating(projectId);
    setOwnerKeys(readOwnerKeys());
    setMyRatings(readMyRatings());
    setNotice('El proyecto y sus archivos/calificaciones fueron eliminados.');
  }

  async function handleRate(projectId: number, rating: number) {
    setRatingBusy(true);
    try {
      const result = await rateProjectRequest(projectId, rating, getVoterId());
      saveMyRating(projectId, rating);
      setMyRatings(readMyRatings());
      setProjects((current) => current.map((project) => project.id === projectId ? result.project : project));
      setCatalog((current) => current.map((project) => project.id === projectId ? result.project : project));
      setSelected(result.project);
      setNotice('Calificación guardada. Puedes cambiarla cuando quieras.');
    } catch (error) {
      setNotice(error instanceof Error ? error.message : 'No pudimos guardar tu calificación.');
    } finally { setRatingBusy(false); }
  }

  const clearFilters = () => setFilters(emptyFilters);
  const hasFilters = Boolean(filters.category || filters.technology || filters.q);

  return (
    <>
      <header className="site-header" id="inicio">
        <div className="header-inner">
          {wordmark}
          <nav className="main-nav" aria-label="Navegación principal">
            <a className="nav-link" href="#explorar">Proyectos <span className="nav-count">{catalog.length.toString().padStart(2, '0')}</span></a>
            <a className="nav-link" href="#como-funciona">Cómo funciona</a>
          </nav>
          <button className="button button-lime header-cta" onClick={openCreateForm}>
            <Plus size={16} /> Publicar proyecto <ArrowUpRight size={14} />
          </button>
        </div>
      </header>

      <main>
        <section className="hero-section">
          <div className="hero-shell">
            <img
              className="hero-art"
              src="/manus-storage/async-images/QAh7tsyxnFGpflD3ZLqtLp/image-1.webp"
              alt=""
              aria-hidden="true"
              onError={(event) => {
                event.currentTarget.onerror = null;
                event.currentTarget.src = 'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1800&q=85';
              }}
            />
            <div className="hero-grain" />
            <div className="hero-content">
              <div className="hero-kicker"><span className="live-pulse" /> IDEAS EN MOVIMIENTO <span className="kicker-line" /> VOLUMEN 01</div>
              <h1>El futuro no se<br />espera. <em>Se proyecta.</em></h1>
              <p className="hero-copy">Un escaparate para ideas tecnológicas que están listas para salir del aula y encontrar su próximo capítulo.</p>
              <div className="hero-actions">
                <a className="button button-lime" href="#explorar">Explorar proyectos <ArrowDownRight size={16} /></a>
                <button className="button button-quiet" onClick={openCreateForm}>Presenta tu idea <ArrowUpRight size={15} /></button>
              </div>
              <div className="hero-footnote"><span className="footnote-asterisk">✳</span><span>Hecho por aprendices.<br />Abierto a todo el mundo.</span></div>
            </div>
            <div className="hero-visual-label"><span>LAB / 2025—26</span><span>IDEA → IMPACTO</span></div>
            <div className="hero-side-note"><span className="side-note-line" /> TECNOLOGÍA CON INTENCIÓN</div>
          </div>
          <div className="ticker-row" aria-label="Valores de Proyecta">
            <div className="ticker-item"><span className="ticker-symbol">✳</span><span>IDEAS ABIERTAS</span></div>
            <div className="ticker-item"><span className="ticker-symbol">↗</span><span>TECNOLOGÍA CON PROPÓSITO</span></div>
            <div className="ticker-item"><span className="ticker-symbol">✳</span><span>HECHO PARA CONECTAR</span></div>
            <div className="ticker-item"><span className="ticker-symbol">↗</span><span>EL SIGUIENTE PASO ES TUYO</span></div>
          </div>
        </section>

        <section className="showcase-section page-section" id="explorar">
          <div className="section-overline"><span>01 — LA VITRINA</span><span>EXPLORA LO QUE VIENE</span></div>
          <div className="showcase-heading">
            <div><span className="eyebrow">PROYECTOS PUBLICADOS</span><h2>Ideas que ya están<br /><em>en movimiento.</em></h2></div>
            <p>Prototipos, productos y experimentos de aprendices que están convirtiendo buenas preguntas en algo real.</p>
          </div>

          <div className="filter-bar" aria-label="Filtros de proyectos">
            <div className="filter-categories">
              <button className={`filter-pill ${filters.category === '' ? 'is-active' : ''}`} onClick={() => updateFilter('category', '')}>Todo <span>{catalog.length}</span></button>
              {categories.map((category) => <button key={category} className={`filter-pill ${filters.category === category ? 'is-active' : ''}`} onClick={() => updateFilter('category', filters.category === category ? '' : category)}>{category}</button>)}
            </div>
            <div className="filter-tools">
              <label className="search-box"><Search size={16} /><input id="project-search" aria-label="Buscar proyectos" placeholder="Buscar ideas…" value={filters.q} onChange={(event) => updateFilter('q', event.target.value)} /><kbd>Ctrl/⌘ K</kbd></label>
              <label className="tech-select-label"><Layers3 size={15} /><span className="sr-only">Filtrar por tecnología</span><select aria-label="Filtrar por tecnología" value={filters.technology} onChange={(event) => updateFilter('technology', event.target.value)}><option value="">Tecnología</option>{technologies.map((tech) => <option value={tech} key={tech}>{tech}</option>)}</select><ChevronDown size={14} /></label>
            </div>
          </div>

          <div className="results-line"><span>{loading ? 'BUSCANDO EN LA VITRINA…' : <>{String(resultCount).padStart(2, '0')} {resultCount === 1 ? 'PROYECTO' : 'PROYECTOS'} {hasFilters && <span className="results-filtered">· FILTRADOS</span>}</>}</span><span>ORDENADOS POR NOVEDAD <ArrowDownRight size={13} /></span></div>

          {loadError && <div className="load-error" role="alert">
            <CircleHelp size={18} />
            <div><strong>No pudimos cargar la vitrina.</strong><p>{loadError}</p></div>
            <button className="text-link" type="button" onClick={() => {
              setLoading(true);
              Promise.all([listProjects(filters), listProjects()]).then(([filtered, all]) => {
                setProjects(filtered.projects);
                setCatalog(all.projects);
                setResultCount(filtered.total);
                setLoadError('');
              }).catch((error: Error) => setLoadError(error.message)).finally(() => setLoading(false));
            }}>Intentar de nuevo <ArrowRight size={15} /></button>
          </div>}

          {!loadError && loading && <div className="skeleton-grid" aria-label="Cargando proyectos">{[1, 2, 3].map((item) => <div className="skeleton-card" key={item}><div /><span /><span /></div>)}</div>}
          {!loading && !loadError && projects.length > 0 && <div className="projects-grid">
            {projects.map((project, index) => <ProjectCard key={project.id} project={project} index={index} onOpen={setSelected} />)}
            <button className="submit-tile" onClick={openCreateForm}>
              <span className="submit-tile-top"><span className="tiny-spark" /> SIGUIENTE EN LA VITRINA</span>
              <span className="submit-tile-title">¿Y si la<br />siguiente idea<br /><em>fuera la tuya?</em></span>
              <span className="submit-tile-action">Sube tu proyecto <ArrowUpRight size={17} /></span>
              <span className="tile-index">OPEN CALL / 001</span>
            </button>
          </div>}
          {!loading && !loadError && projects.length === 0 && (
            <div className="empty-state">
              <div className="empty-mark">{catalog.length === 0 && !hasFilters ? <Plus size={22} /> : <Search size={22} />}</div>
              <h3>{catalog.length === 0 && !hasFilters ? 'La vitrina espera su primer proyecto.' : 'No hay proyectos con esos filtros.'}</h3>
              <p>{catalog.length === 0 && !hasFilters ? 'Todavía no hay proyectos registrados. Comparte el primero para ponerla en marcha.' : 'Prueba otra búsqueda o explora todas las ideas.'}</p>
              {catalog.length === 0 && !hasFilters
                ? <button className="text-link" onClick={openCreateForm}>Registrar el primer proyecto <ArrowRight size={15} /></button>
                : <button className="text-link" onClick={clearFilters}>Quitar filtros <ArrowRight size={15} /></button>}
            </div>
          )}

          <div className="gallery-footer"><span>ESTO ES SOLO EL COMIENZO <span className="footer-star">✳</span></span><span>HECHO EN COMUNIDAD, LISTO PARA EL MUNDO.</span></div>
        </section>

        <section className="manifesto-section" id="como-funciona">
          <div className="manifesto-shell">
            <div className="manifesto-left"><span className="section-overline">02 — LA SIGUIENTE ETAPA</span><div className="manifesto-stamp"><Compass size={19} /><span>DE PROTOTIPO<br />A POSIBILIDAD</span></div></div>
            <div className="manifesto-main"><span className="eyebrow">CADA GRAN PROYECTO NECESITA UNA PRIMERA MIRADA</span><h2>Una idea crece<br />cuando <em>encuentra</em><br />a su gente.</h2><p>Explora, comparte feedback o lleva una solución un poco más lejos. Proyecta une a quienes construyen con quienes imaginan lo que sigue.</p><a className="button button-outline" href="#explorar">Encuentra tu próximo proyecto <ArrowUpRight size={15} /></a></div>
            <div className="manifesto-graphic" aria-hidden="true"><div className="orbit orbit-one" /><div className="orbit orbit-two" /><div className="orbit-center"><Sparkles size={24} /></div><span className="orbit-label orbit-label-a">CURIOSIDAD</span><span className="orbit-label orbit-label-b">COLABORACIÓN</span><span className="orbit-label orbit-label-c">IMPACTO</span></div>
          </div>
        </section>

        <section className="steps-section page-section">
          <div className="section-overline"><span>03 — CÓMO FUNCIONA</span><span>ABIERTO, COLABORATIVO, EN MOVIMIENTO</span></div>
          <div className="steps-heading"><h2>De la idea<br /><em>a lo que sigue.</em></h2><p>Un lugar sencillo para mostrar el trabajo y abrir la puerta a nuevas colaboraciones.</p></div>
          <div className="steps-grid">
            <article className="step-card"><span className="step-number">01</span><span className="step-icon"><Layers3 size={18} /></span><h3>Descubre</h3><p>Encuentra proyectos por tema o tecnología. Cada uno tiene su historia y su siguiente paso.</p><ArrowUpRight className="step-arrow" size={17} /></article>
            <article className="step-card"><span className="step-number">02</span><span className="step-icon"><ArrowRight size={18} /></span><h3>Conecta</h3><p>Conoce a quienes están detrás, explora su trabajo y comparte tu interés o una idea.</p><ArrowUpRight className="step-arrow" size={17} /></article>
            <article className="step-card"><span className="step-number">03</span><span className="step-icon"><Sparkles size={18} /></span><h3>Hazlo crecer</h3><p>Adopta, prueba o colabora. El próximo capítulo se construye entre más personas.</p><ArrowUpRight className="step-arrow" size={17} /></article>
          </div>
        </section>

        <section className="closing-cta">
          <div className="closing-pattern" aria-hidden="true"><div className="closing-ring ring-a" /><div className="closing-ring ring-b" /><div className="closing-cross">+</div></div>
          <div className="closing-content"><span className="eyebrow"><span className="tiny-spark" /> OPEN CALL · SIEMPRE ABIERTO</span><h2>Lo que sigue<br />empieza <em>contigo.</em></h2><p>Tu trabajo merece salir al mundo. Comparte tu proyecto y encuentra a las personas que pueden llevarlo más lejos.</p><button className="button button-lime" onClick={openCreateForm}>Publicar mi proyecto <ArrowUpRight size={16} /></button></div>
          <span className="closing-issue">PROYECTA · ED. 01</span>
        </section>
      </main>

      <footer className="site-footer">
        <div className="footer-top">{wordmark}<span className="footer-motto">Un escaparate para ideas que merecen llegar más lejos.</span><a href="#inicio" className="back-top">VOLVER ARRIBA <ArrowUpRight size={13} /></a></div>
        <div className="footer-bottom"><span>© 2026 PROYECTA · HECHO PARA CRECER JUNTOS</span><span>TECNOLOGÍA CON INTENCIÓN <span className="footer-star">✳</span></span><a href="#explorar">VER LA VITRINA <ArrowUpRight size={12} /></a></div>
      </footer>

      {notice && <div className="toast" role="status"><span className="toast-check"><Check size={15} /></span><span>{notice}</span><button onClick={() => setNotice('')} aria-label="Cerrar aviso">×</button></div>}
      {ownerKeyReminder && <aside className="owner-key-reminder" role="status">
        <div><strong>La clave privada de “{ownerKeyReminder.title}”</strong><p>Se guardó en este navegador. Descarga una copia: si borras los datos locales o pierdes la clave, no se puede recuperar.</p></div>
        <button className="button button-lime" type="button" onClick={() => downloadOwnerKey(ownerKeyReminder.id, ownerKeyReminder.title, ownerKeyReminder.key)}><Download size={15} /> Guardar copia</button>
        <button className="owner-key-dismiss" type="button" onClick={() => setOwnerKeyReminder(null)} aria-label="Cerrar aviso de clave">×</button>
      </aside>}
      <ProjectDialog
        project={selected}
        onClose={() => setSelected(null)}
        isOwner={Boolean(selected && ownerKeys[String(selected.id)])}
        myRating={selected ? (myRatings[selected.id] || 0) : 0}
        ratingBusy={ratingBusy}
        onRate={handleRate}
        onClaim={handleClaim}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <ProjectForm
        open={formOpen}
        onClose={() => { setFormOpen(false); setEditingProject(null); }}
        projectToEdit={editingProject}
        ownerKey={editingProject ? ownerKeys[String(editingProject.id)] : undefined}
        onSaved={handleSaved}
      />
    </>
  );
}
