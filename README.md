# Mi Apuntador · versión 0.1

Primera versión de una app web instalable (PWA) para practicar obras de teatro en Android.

## Cómo usarla

1. Publica **todos los archivos** de esta carpeta en un servidor HTTPS (por ejemplo, GitHub Pages). No abras `index.html` desde el gestor de archivos Android: el almacenamiento puede funcionar pero no la instalación, el micrófono ni el servicio offline de forma fiable.
2. Abre la dirección web en **Chrome para Android** y elige el menú ⋮ > **Añadir a pantalla de inicio / Instalar aplicación** (según versión de Chrome).
3. Carga la obra de ejemplo o importa un archivo PDF con texto seleccionable, TXT o MD.
4. Revisa en **Editar** la separación en escenas, personajes y réplicas. Puedes editar frases, asignar personajes, crear escenas, reordenar o eliminar intervenciones.
5. En **Preparar** elige tu personaje, toda la obra o las escenas deseadas, el modo y las opciones de voz.
6. Pulsa **Empezar ensayo**. Si es tu turno puedes hablar, pedir pistas o revelar el texto. También puedes avanzar manualmente.

## Persistencia y privacidad

- Las obras y correcciones se guardan en **IndexedDB**, en el propio navegador/dispositivo. El identificador de obra activa se conserva mediante localStorage.
- No hay servidor de almacenamiento de guiones ni cuenta de usuario.
- **Exportar copia de seguridad** genera un JSON con todas tus obras; **Restaurar copia** permite recuperarlas. Importante: borrar los datos de Chrome, cambiar de dispositivo o desinstalar la PWA puede borrar la base local. Exporta copias periódicas.
- El reconocimiento de voz es el que proporciona el navegador: **puede enviar audio a servicios externos** y puede requerir conectividad. Si la obra es confidencial, desactívalo. La lectura de las réplicas usa el sintetizador de voz del navegador/dispositivo.
- PDF.js se carga desde CDN al importar el primer PDF, por lo que necesita Internet en esa primera importación y posiblemente en ocasiones posteriores. No se envía el PDF a un backend de esta aplicación; lo procesa el navegador mediante PDF.js. Una transcripción de PDF escaneado no es compatible actualmente.
- En Android algunas voces y permisos solo están disponibles si se han instalado o habilitado en ajustes del sistema.

## Límites de la primera versión

- Detección de personajes y escenas **heurística**. Es imprescindible revisar la transcripción; dramaturgias con formatos especiales no se analizarán perfectamente.
- Solo interpreta automáticamente los formatos `PERSONAJE: diálogo`, `PERSONAJE. diálogo` y personaje en mayúsculas sobre línea separada; puede haber falsos positivos. Se conserva el texto original para volver a analizarlo.
- La comprobación del texto hablado es aproximada por coincidencia de palabras, no identifica orden, ritmo ni interpretación, ni se puede considerar una transcripción literal.
- La reproducción automática sin tocar la pantalla depende del navegador y puede requerir haber pulsado el botón de ensayo. La escucha automática es experimental; el modo manual es la opción más robusta.
- No hay sincronización entre móviles ni reconocimiento OCR de PDF escaneados.

## Actualizar

Sustituye los archivos en GitHub Pages. Si haces modificaciones técnicas al JS/CSS, cambia el nombre de caché (`mi-apuntador-v1`) en `sw.js` para forzar la actualización offline.

## Desarrollo y pruebas en escritorio

Desde esta carpeta: `python3 -m http.server 8000` y abre `http://localhost:8000`. La instalación PWA real necesita HTTPS, salvo localhost, que se considera un origen seguro para pruebas.
