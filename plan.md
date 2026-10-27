# Proyecta — plan de implementación

## Alcance y arquitectura

Aplicación de escaparate para proyectos tecnológicos de aprendices, con una página de galería, detalle por proyecto y un formulario reutilizable para alta y edición. Frontend React + TypeScript, Vite y Tailwind CSS; backend Node.js + Express; persistencia SQLite/WebAssembly (`sql.js`) en `backend/data/proyecta.sqlite`, sin dependencia de compilador C++ en Windows. Vite corre en 3000 y reenvía `/api` y `/uploads` al backend Express en 3001.

Mantener la galería vacía en una base sin proyectos reales y no insertar datos ficticios. CRUD REST: `GET /api/projects` lista y filtra, `GET /api/projects/:id` consulta uno, `POST /api/projects` crea, `PUT /api/projects/:id` actualiza el registro completo y `DELETE /api/projects/:id` lo elimina, junto con sus calificaciones y adjuntos locales. Las altas aceptan JSON o multipart; actualizaciones aceptan los mismos campos y archivos opcionales, verificando firmas de archivo. Las calificaciones son enteros de 1 a 5 con promedio y cantidad visibles; SQLite conserva un voto por proyecto y por identificador aleatorio de navegador, guardado de forma seudónima como hash, y permite actualizarlo.

No crear un administrador universal ni una cuenta compartida. En cada alta el servidor genera una clave aleatoria de propietario; devuelve el valor en esa respuesta solamente y almacena únicamente su hash SHA-256 en SQLite. El navegador guarda la clave en `localStorage` asociada al ID del proyecto y la envía como Bearer token para `PUT` y `DELETE`. Solo quien conserva esa clave podrá editar o eliminar ese proyecto. Ofrecer una copia descargable; si el almacenamiento del navegador se pierde, el dueño podrá pegar la clave desde su respaldo y recuperarla localmente tras validarla mediante `POST /api/projects/:id/owner/verify`. El servidor nunca guarda ni devuelve la clave en claro después del alta. Las filas anteriores sin hash se conservan y no se pueden administrar desde la interfaz; no asignarles claves retroactivamente.

Conservar la identidad editorial tecnológica nocturna existente: carbón `#111310`, superficies oscuras, marfil y lima `#C7F36B`, Space Grotesk/Inter, hero asimétrico y bordes finos. Mantener accesibilidad de los diálogos (foco inicial, trampa Tab/Shift+Tab, Escape y retorno del foco), el formulario de adjuntos y una interfaz de tarjetas/detalles con estrellas, controles de editar/borrar visibles solo para el propietario local. Preparar un prompt autónomo de Stitch para una página responsive de la vitrina que represente el estado vacío real y componentes de detalle/gestión sin crear proyectos ficticios.

## Estructura principal

```text
proyecta/
├── backend/
│   ├── src/server.js (rutas REST, autorización, rating, uploads)
│   ├── src/database.js (esquema SQLite, migraciones y serialización)
│   ├── src/validation.js (esquemas Zod)
│   ├── test/crud.test.js (prueba integral de la API con datos temporales)
│   ├── data/ (SQLite local, ignorado por Git)
│   └── uploads/ (adjuntos, ignorados por Git)
├── frontend/
│   ├── public/ (marca, favicon y manifiesto de rutas)
│   └── src/
│       ├── components/ (galería, diálogos, formularios y estrellas)
│       ├── hooks/ (gestión de foco accesible)
│       ├── lib/ownership.ts (claves privadas y voto de navegador)
│       ├── api.ts y tipos TypeScript
│       └── styles.css
├── README.md (ejecución, respaldo y publicación a un repositorio GitHub propio)
├── STITCH_PROMPT.md (prompt copiable para diseñar una página)
├── package.json
├── plan.md
└── TODO.md
```

## Diseño

Estilos candidatos: **Editorial tecnológico nocturno** — 0,08; **Neo-brutalismo cromático** — 0,04; **Laboratorio sci-fi inmersivo** — 0,02. Se elige editorial tecnológico nocturno: profesional, humano y con energía de producto, en línea con un escaparate moderno y un dark mode elegante.

- **Movimiento de diseño:** editorial digital contemporáneo, con la claridad de un journal de diseño de producto y acentos de interfaz técnica.
- **Principios:** contraste tipográfico marcado; información primero y navegación directa; superficies oscuras cálidas con una única señal cromática; controles sencillos con estados táctiles evidentes.
- **Filosofía de color:** carbón tinta y marfil tenue reducen el deslumbramiento y elevan los medios; verde lima eléctrico representa oportunidad y adopción, mientras los tonos de cada proyecto viven en su imagen, no en adornos del sistema.
- **Paradigma de layout:** hero asimétrico de dos columnas (mensaje amplio, panel visual flotante), carril horizontal de filtros y una galería editorial de tarjetas de alturas y proporciones variadas; los detalles se expanden en un diálogo sobre la misma página.
- **Elementos distintivos:** marca geométrica «P» construida con dos trazos; filetes finos tipo ficha de archivo con índice/estado; destellos verde lima en CTA y etiquetas activas.
- **Interacción:** filtros y resultados claros; detalle sin perder posición; feedback junto al formulario; estrellas que muestran promedio y voto; acciones de propiedad condicionadas por una clave privada; diálogos manejables por teclado y respetuosos con movimiento reducido.
- **Animación:** entrada breve de hero y tarjetas con desvanecimiento/desplazamiento leve; hover de imagen y borde sutil; evitar animaciones perpetuas o que retrasen lectura.
- **Tipografía:** Space Grotesk para titulares y navegación, Inter para cuerpo y controles; titulares de gran escala, etiquetas compactas en mayúsculas y metadatos legibles.
- **Esencia de marca:** conecta buenas ideas de aprendices con personas capaces de probarlas y llevarlas más lejos; **curiosa, precisa, abierta**.
- **Voz:** concreta y optimista, con lenguaje de producto y comunidad. Ejemplos: «Ideas que ya están listas para probarse.» / «Explora, conecta, ayúdalas a crecer.»
- **Logotipo:** palabra “proyecta” en minúscula acompañada por un símbolo geométrico de dos piezas que forman una P/flecha de avance; SVG ligero para el UI.
- **Color distintivo:** lima eléctrico `#C7F36B`.

## Ejecución local y GitHub

Node.js 20 o superior. En la carpeta raíz, `npm install` y `npm run dev`; abre `http://localhost:3000` (la API usa 3001). `npm run dev:backend` y `npm run dev:frontend` permiten abrirlos por separado. SQLite y adjuntos se guardan localmente y se excluyen de Git; respaldar ambos directorios al migrar. Para GitHub, el README explica cómo crear un repositorio vacío y enviar la carpeta desde una instalación local de Git, sin incluir la base, los uploads ni secretos.
