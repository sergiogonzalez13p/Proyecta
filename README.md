# Proyecta

Vitrina de proyectos tecnológicos de aprendices. Frontend React/Vite/Tailwind, API REST Node.js/Express y persistencia SQLite/WebAssembly (`sql.js`) en `backend/data/proyecta.sqlite`. No requiere herramientas C++ en Windows. No se crean proyectos ficticios: una base recién creada muestra el estado vacío hasta que alguien publique uno.

## Iniciar en Windows

Requisitos: Node.js 20 o superior y npm (Node 24.16 también funciona). Abre PowerShell **en la carpeta que contiene `package.json`** y ejecuta:

```powershell
npm install
npm run dev
```

Abre **http://localhost:3000** para ver la aplicación. Express escucha la API en **http://localhost:3001**; ese puerto no muestra la web, así que `Cannot GET /` al abrir `:3001/` es normal. Para verificar la API puedes abrir `http://localhost:3001/api/health`. Detén ambos servidores con `Ctrl+C`.

También puedes ejecutar cada servidor en una terminal aparte, desde la raíz:

```powershell
npm run dev:backend
npm run dev:frontend
```

La base local se crea automáticamente en `backend/data/proyecta.sqlite`. Si migras desde una versión antigua, se retiran una sola vez solo las seis fichas ficticias identificadas; no se borran otros proyectos registrados.

## Registrar, editar y eliminar

Pulsa **Publicar proyecto**, completa el formulario y envíalo. Se aceptan correos Gmail normales. Al crear, el servidor genera una clave privada aleatoria: guarda el archivo descargable `proyecta-clave-ID.txt`. La clave se necesita para editar o eliminar **ese proyecto**; el servidor almacena solo un hash y no hay cuentas, administrador universal ni recuperación centralizada. La clave se conserva en el almacenamiento local del navegador. Si cambias de navegador o borras sus datos, abre la ficha del proyecto, elige **¿Es tu proyecto? Recuperar clave privada**, copia el texto que aparece después de `Clave:` desde tu archivo de respaldo y verifica; la clave quedará guardada otra vez en ese navegador. No compartas ese archivo. En una publicación pública, usa siempre HTTPS y evita scripts de terceros no confiables: como cualquier secreto guardado en `localStorage`, una vulnerabilidad XSS del mismo origen podría leerlo.

En la ficha de los proyectos propios aparecen **Editar** y **Eliminar**. El borrado pide confirmación y quita el registro, sus calificaciones y los archivos locales adjuntos. No se puede modificar o eliminar un proyecto ajeno sin su clave privada. Los proyectos antiguos sin clave permanecen visibles pero no se administran desde la interfaz.

## Calificaciones

Cada ficha acepta de una a cinco estrellas y muestra promedio y cantidad de votos. En un mismo navegador se puede cambiar el voto; se conserva en SQLite un voto por proyecto y por identificador aleatorio persistido en el navegador, del cual solo se almacena un hash. No hay inicio de sesión: borrar los datos del navegador o usar otro perfil puede crear otro identificador, así que el rating no pretende probar la identidad de una persona.

## Archivos multimedia

La portada admite JPG/JPEG, PNG, WEBP y GIF de hasta **8 MB**. El archivo multimedia acepta video MP4, WEBM o MOV; audio MP3, M4A, WAV u OGG; y PDF, de hasta **16 MB**. El navegador valida tamaño y tipo y el servidor comprueba la firma binaria real antes de aceptar el archivo. Puedes usar URL en vez de archivo.

Los archivos se guardan en `backend/uploads/` y las referencias en SQLite; permanecen tras reiniciar el servidor. Para respaldar o mover la aplicación, copia **tanto** `backend/data/proyecta.sqlite` como `backend/uploads/`. `.gitignore` excluye ambos para no subir datos ni medios personales a GitHub accidentalmente. El almacenamiento de archivos es local a esta instalación.

## API REST

Base local: `http://localhost:3001`. La API ofrece:

- `GET /api/health`: estado del servidor.
- `GET /api/projects`: lista y filtros `category`, `technology` y `q`.
- `GET /api/projects/:id`: detalle con promedio y total de calificaciones.
- `POST /api/projects`: creación JSON o `multipart/form-data`; la respuesta de alta entrega la clave privada una sola vez.
- `PUT /api/projects/:id`: actualización completa; requiere `Authorization: Bearer <clave-privada>` y acepta JSON o multipart.
- `DELETE /api/projects/:id`: borra solo con `Authorization: Bearer <clave-privada>`; devuelve `204` al completar.
- `POST /api/projects/:id/owner/verify`: comprueba una clave recuperada sin devolverla ni almacenarla en claro.
- `POST /api/projects/:id/ratings`: cuerpo JSON `{ "rating": 1, "voterId": "uuid-del-navegador" }`; permite de 1 a 5 y reemplaza el voto previo de ese identificador.

Variables opcionales: `PORT`, `FRONTEND_ORIGIN`, `DATABASE_PATH` y `UPLOADS_DIRECTORY`. Valores por defecto: puertos 3001/3000, SQLite `backend/data/proyecta.sqlite` y adjuntos `backend/uploads/`.

## Comprobar la aplicación

```powershell
npm test
npm run build
```

`npm test` inicia una API aislada y verifica la creación, consultas, valoración, edición con adjuntos, firma real de archivos, persistencia al reiniciar, protección de propietario y eliminación en una base temporal; no modifica tus datos locales.

## Prompt para Stitch

El prompt en español, con dirección visual, estado vacío real y variantes de los diálogos, está en [`STITCH_PROMPT.md`](./STITCH_PROMPT.md). Pégalo en Stitch y genera primero la página responsive de la vitrina; el prompt especifica que no se deben inventar ni sembrar proyectos de muestra. El diseño de Stitch es una referencia visual, no sustituye la API ni el código React.

## Subir el proyecto local a GitHub

1. En GitHub, crea un repositorio **vacío** (no marques crear README, `.gitignore` o licencia). Elige público o privado según prefieras.
2. Extrae el archivo ZIP en una carpeta nueva. Asegúrate de que `package.json` está en la raíz de esa carpeta. Abre PowerShell allí. La descarga no incluye `.git`, `node_modules`, base SQLite, adjuntos ni secretos.
3. Si Git para Windows no está instalado, instálalo desde `https://git-scm.com/download/win`. Configura tu nombre/correo solo si Git los solicita:

```powershell
git config --global user.name "Tu nombre"
git config --global user.email "tu-correo@example.com"
```

4. Desde la carpeta del proyecto, sustituye `TU-USUARIO` y `TU-REPOSITORIO` por los de GitHub y ejecuta:

```powershell
git init -b main
git add .
git status
git commit -m "Publica Proyecta"
git remote add origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git
git push -u origin main
```

`git status` sirve para confirmar que no se añadieron datos SQLite, la carpeta `uploads` ni `.env`. Si Git solicita acceso, inicia sesión mediante el navegador/Git Credential Manager; no pegues tokens en el código. Si `origin` ya existe, usa `git remote set-url origin https://github.com/TU-USUARIO/TU-REPOSITORIO.git` en vez de `git remote add origin`.

El envío a GitHub guarda el código; por sí solo no publica la aplicación como sitio web. La base SQLite y los adjuntos permanecen en tu computadora. Para producción pública se necesitaría un alojamiento persistente para esos datos o migrar a almacenamiento/BD administrados.
