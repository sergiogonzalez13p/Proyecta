# Prompt para Stitch — Vitrina Proyecta

Copia desde aquí el prompt completo y pégalo en Stitch:

> Diseña una sola página web responsive para **Proyecta**, una vitrina/showcase para proyectos tecnológicos reales creados por aprendices. Quiero una página de alta fidelidad que pueda llevarse a un frontend React ya existente; prioriza jerarquía visual, espaciado, tipografía, componentes reutilizables y estados claros en escritorio y móvil.
>
> **Regla de datos:** la vitrina inicia vacía. No inventes nombres de proyectos, equipos, autores, valoraciones, estadísticas ni testimonios. No pongas tarjetas de ejemplo. El estado real debe indicar que aún no hay proyectos publicados y ofrecer el botón **“Registrar el primer proyecto”**. Puedes diseñar una tarjeta de proyecto como componente de referencia aislado, pero déjala fuera de la galería inicial y no le asignes contenido ficticio.
>
> **Identidad visual:** estética editorial tecnológica nocturna, contemporánea y de alto contraste; carbón `#111310`, superficies `#171914`, texto marfil `#F0F1E9`, lima propia `#C7F36B`, acentos verde salvia, bordes finos y espacio generoso. Combina titulares de carácter (Space Grotesk o equivalente geométrica) con texto UI sobrio (Inter). Evita aspecto de dashboard genérico, gradientes neón excesivos, exceso de tarjetas y ornamentos stock. Marca wordmark tipográfico “proyecta.” con símbolo geométrico original pequeño; no sustituyas el nombre por un logo de una startup inventada.
>
> **Página principal “Explorar proyectos”:** crea un header discreto con wordmark, enlaces “Proyectos” y “Cómo funciona” y CTA lima “Publicar proyecto”. Diseña un hero editorial amplio, asimétrico, con un motivo visual abstracto de tecnología con intención (capas, luz cálida verde, componentes/órbitas; sin imágenes de personas ni logos inventados), el título “El futuro no se espera. Se proyecta.”, una frase breve en español y dos acciones: “Explorar proyectos” y “Presenta tu idea”. Debajo, añade una franja tipográfica fina.
>
> La sección principal de la vitrina debe mostrar: etiqueta de sección, título, texto, filtros por categoría, búsqueda con indicación de teclado “Ctrl/⌘ K” y selector por tecnología. Representa el estado vacío con `00 proyectos`, un icono lineal sobrio, el texto “La vitrina espera su primer proyecto.”, una explicación corta y el CTA “Registrar el primer proyecto”. No dibujes tarjetas falsas debajo del mensaje. Finaliza con una sección “Cómo funciona” de tres pasos visualmente ligeros y un cierre/CTA para publicar la primera idea.
>
> Diseña también dentro del mismo archivo/frame como **variantes de estado**, no como contenido de galería: (1) el modal de registro responsive, con datos de proyecto, categoría, tecnologías, URL o selector de archivo para portada, selector multimedia, correo normal `tuusuario@gmail.com` y CTA enviar; los archivos deben verse como selección del usuario, no mockups cargados; (2) una plantilla vacía del diálogo de detalle, que incluya región de promedio y estrellas 1–5, valoraciones, enlaces, contacto, y los controles “Editar”/“Eliminar” solo visibles en estado `propietario verificado`; incluye un estado alternativo donde el usuario pega su clave privada de respaldo para restaurar el acceso. Son estados de interfaz, no proyectos ficticios que deban publicarse.
>
> **Responsive:** entrega composición de escritorio 1440 px y móvil 390 px. En móvil, apila con intención, conserva el titular, permite filtros desplazables o apilados y hace formularios/diálogos utilizables con pulgar; evita desbordamiento horizontal. Mantén targets táctiles grandes, contraste legible, foco visible y etiquetas accesibles. La versión móvil debe parecer diseñada, no solo comprimida.
>
> **Interacciones a representar:** CTA abre registro, “Explorar” desplaza a la vitrina, búsqueda y filtros tienen estados activo/vacío, botones y enlaces comunican hover/focus, diálogos muestran botón de cerrar, foco y confirmación de borrado. El rating solo cambia al seleccionar una estrella. Para eliminar, solicita confirmación explícita. No inventes una cuenta universal: la administración pertenece a la persona que presenta la clave privada de su proyecto.
>
> Resultado esperado: una sola página “Explorar proyectos” y las variantes de modal indicadas, en español, lista para servir de referencia visual al implementar el sitio existente. No generes instrucciones de backend ni rellenes el estado vacío con contenido inventado.

## Cómo usarlo

En Stitch, inicia un diseño web, pega el prompt, revisa el frame de escritorio y su variante móvil, y ajusta los detalles visuales que prefieras. Mantén el estado inicial vacío: los proyectos reales aparecerán al registrarlos mediante el formulario de Proyecta. El diseño de Stitch es una referencia visual; no sustituye la API ni el código de React del proyecto.
