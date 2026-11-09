# Mi Apuntador v2.1 — PWA instalable en Android

Actualización de la versión 2.0. Conserva la base de datos `mi-apuntador-db` y la tabla `works`: **no borres los datos del sitio** durante la actualización.

## Actualizar tu GitHub Pages

1. En el móvil, antes de actualizar: **Obras → Exportar copia de seguridad**. Guarda ese JSON fuera de la aplicación.
2. En Terminal, dentro del repositorio local, comprueba que trabajas en `main` y sincroniza **antes de copiar los archivos nuevos**:

   ```bash
   git branch --show-current
   git pull --ff-only origin main
   ```

3. Descomprime `Mi_Apuntador_Android_v2.1.zip`. Sustituye los archivos del repositorio por los que hay **dentro de la carpeta `mi-apuntador/`** del ZIP. Mantén intacta la carpeta oculta `.git`. Después ejecuta:

   ```bash
   git add index.html app.js sw.js manifest.webmanifest icon.svg README.md
   git commit -m "Mi Apuntador v2.1: ensayo inteligente"
   git push origin main
   ```

   Si `git pull` avisa de que sobrescribiría cambios locales, no lo fuerces: resuelve primero esa situación. Comprueba que el resultado de `git branch --show-current` es `main` antes de subir.
4. Abre el mismo enlace de GitHub Pages desde Chrome Android. El service worker utiliza una caché nueva (`mi-apuntador-v2.1`). Si sigues viendo la v2.0, cierra la aplicación y recarga la dirección en Chrome; puede que debas cerrar y abrir la PWA de nuevo.
5. Comprueba que tu obra sigue en «Obras» y que «Inicio» permite preparar o continuar un ensayo. Si falta una obra, importa la copia JSON.

**Importante:** no subas el JSON ni el PDF de la obra a un repositorio público de GitHub. Impórtalos en el móvil desde la app.

## Cambios

- Inicio prioritario, «Preparar», «Obras» y «Ajustes»; la pestaña «Ensayar» solo se muestra con una sesión preparada.
- «Preparar» permite elegir una escena y **un punto de inicio** filtrando por personaje o palabras del texto.
- En ensayo se puede **saltar directamente** a una intervención, repetir solo el turno actual, repetir la última réplica ajena y pulsar **«He terminado»** en cualquier intervención propia.
- Se admite reconocimiento automático de las intervenciones; se intenta mantener la escucha mediante reactivación limitada en pausas. El botón «He terminado» siempre está disponible. Ante errores como `network`, no se fuerza un bucle de reintentos.
- Idioma principal por obra y campo `languageSegments` por intervención. Se lee por fragmentos y se intenta reconocer secuencialmente con el idioma indicado para cada parte. Chrome no puede reconocer varios idiomas a la vez de forma garantizada.
- Edición de `languageSegments` por intervención. Cada elemento debe tener `text` y `language`. **La concatenación exacta de los fragmentos debe coincidir con el texto de la intervención**, para evitar perder palabras. Idiomas: `ca-ES`, `es-ES`, `de-DE`, `fr-FR`, `en-US`, `it-IT`.
- Velocidad de síntesis ajustable de 0,60× a 2,00×; predeterminado 1,15×. Se puede modificar durante el ensayo y se guarda por obra.
- Recuperación de la posición de un ensayo interrumpido, junto con su personaje, selección de escenas y modo.
- Se conservan los parlamentos colectivos (`TOTES`) y las intervenciones compartidas que incluyen a Louise como turnos propios que no se leen en voz alta.
- JSON de obra y sus metadatos, acotaciones y canciones: compatible con el archivo del primer acto preparado previamente.

## Limitaciones

- La síntesis de voz **lee**, no canta. El orden y la asignación de versos de canciones con varias columnas deben revisarse manualmente.
- La detección de final de frase es **aproximada** y puede adelantar o retrasar el paso; usa «He terminado» para control manual. Durante el cambio de idioma pueden producirse pausas y reconocimientos inexactos.
- Chrome Android es el navegador aconsejado. Otros navegadores pueden dar errores de reconocimiento (`network`). Las funciones de voz pueden necesitar conexión y voces instaladas. No es un reconocimiento offline garantizado.
- No hay sincronización de guiones entre dispositivos. IndexedDB conserva las obras solo mientras mantengas los datos de ese sitio y navegador; conserva copias JSON periódicas.
- Los PDF con tablas/columnas pueden extraerse mal. Para esta obra, importa el JSON del acto I en lugar de analizar el PDF directamente.

## Archivos del proyecto

`index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg` y `README.md`. Para GitHub Pages, colócalos en la raíz publicada del repositorio.
