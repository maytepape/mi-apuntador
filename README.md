# Mi Apuntador v2.2 — actualización de interfaz

PWA para ensayar obras de teatro en Android. Esta versión modifica la navegación y añade temas de apariencia, sin cambiar el nombre ni la versión de la base de datos (`mi-apuntador-db`, almacén `works`). **No elimines los datos del sitio** para actualizar.

## Novedades

- **Claro / Oscuro / Automático** en Ajustes → Apariencia. El modo automático sigue la preferencia del sistema operativo. Se guarda localmente en el navegador.
- **Inicio centrado en el ensayo**: muestra obra activa, personaje, idioma, continuar ensayo si hay uno guardado, preparar ensayo y accesos a escenas. No hay gestión ni edición en la portada cuando la obra está validada.
- **Primer uso guiado**: si no hay obras, la portada ofrece «Añadir mi primera obra». Si la obra activa necesita revisión, ofrece «Revisar y validar diálogos».
- **Validación explícita**: una nueva obra importada queda pendiente hasta pulsar «He revisado esta obra · Lista para ensayar» desde el editor. La pestaña Preparar aparece solo cuando la obra activa está validada.
- **Gestión de obras desde Ajustes → Gestionar obras**: importar, cambiar obra, editar, restaurar/exportar copias y eliminar.
- **Compatibilidad con v2.1**: las obras antiguas que ya contienen intervenciones se consideran revisadas para no interrumpir su uso; no cambia el formato `scenes`, ni el sistema de participantes, idiomas, acotaciones o `practiceState`.
- Se conservan las funciones de escucha, botón «He terminado», repetición de turno, idiomas por fragmentos, cambio de velocidad, salto a intervención y memoria de progreso.

## Publicación en GitHub Pages

1. Desde la app v2.1, exporta una copia de seguridad en **Obras → Exportar copia de seguridad**.
2. Descomprime este ZIP. Copia a la **raíz de la rama que publicas** los seis archivos de `mi-apuntador/`: `index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg` y `README.md`.
3. Desde tu repositorio local, si quieres seguir desarrollando sobre la rama `v2.1` sin tocar `main`:
   ```bash
   git switch v2.1
   git pull --ff-only origin v2.1
   # Copia ahora los seis archivos actualizados a la carpeta del repositorio
   git add index.html app.js sw.js manifest.webmanifest icon.svg README.md
   git commit -m "Mi Apuntador v2.2: temas e inicio de ensayo"
   git push origin v2.1
   ```
4. GitHub Pages solo sirve directamente **una rama por repositorio** bajo el endpoint configurado. Subir esta versión a `v2.1` no altera `main`, pero solo se publicará en la web si Pages usa esa rama o si existe un workflow específico para desplegarla en otra ruta.
5. Abre la URL con Chrome Android. El service worker usa caché `mi-apuntador-v2.2`. Si ves la pantalla anterior, recarga tras completarse la publicación.

**Privacidad**: no subas los guiones ni los JSON de una obra a un repositorio público; impórtalos localmente desde la PWA.

## Comprobaciones recomendadas

- Primera instalación sin obras → pantalla de bienvenida → importar JSON → revisar → validar → Inicio con escenas.
- Actualización con obras de v2.1 → portada de ensayo sin reimportar obras y con progreso anterior.
- Ajustes → modo Claro, Oscuro y Automático → cerrar/reabrir → se mantiene preferencia.
- Ajustes → Gestionar obras → editar → volver → seleccionar otra obra → Inicio actualizado.
- Preparar y reanudar ensayo → Louise y `TOTES` continúan marcados como turnos propios.

## Limitaciones

El reconocimiento de voz se basa en la API del navegador, que puede necesitar red, y se ha probado principalmente para Chrome Android en sesiones anteriores. La síntesis de voz no canta. Los fragmentos de diferentes idiomas necesitan revisión manual. Las obras se conservan **por origen y navegador** en IndexedDB; la misma aplicación en otra ruta web o navegador puede tener una base de datos distinta. Realiza copias de seguridad regulares.
