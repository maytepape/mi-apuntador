# Mi Apuntador v2.0 — PWA para Android

Aplicación web instalable para ensayar obras de teatro. No requiere servidor ni cuenta para guardar las obras: utiliza IndexedDB del navegador. La configuración y las correcciones permanecen guardadas entre aperturas, salvo que se borren los datos del sitio/navegador.

## Actualizar GitHub Pages (sin borrar los guiones)

1. **Antes de actualizar**, abre la aplicación v0.1 en Android y usa **Obras → Exportar copia de seguridad** para guardar tus datos.
2. Descomprime el ZIP y sube a la **raíz de la misma rama GitHub Pages** los seis archivos (`index.html`, `app.js`, `sw.js`, `manifest.webmanifest`, `icon.svg`, `README.md`) sustituyendo los existentes. **No** subas el ZIP sin descomprimir.
3. Espera a que GitHub Pages termine de publicar y vuelve a abrir la misma URL. Si ves la versión antigua, cierra la aplicación y vuelve a abrirla; en Chrome prueba una recarga completa. El service worker cambia de caché a v2.0.
4. Los guiones y sus correcciones se mantienen si abres **exactamente el mismo dominio y ruta** y no borras los datos del sitio. Si no aparecen, restaura la copia JSON mediante **Obras → Restaurar copia**.
5. Para el ensayo de *Nou dones i un misteri*, importa el JSON estructurado que se preparó por separado, elige **LOUISE**, idioma **Català**, y selecciona la escena deseada. **No subas un guion privado a un repositorio público.**

## Novedades

- Importa el formato JSON de obra con `scenes[].lines[]`, `type` (`dialogue`, `song`, `direction`), `stageDirections[]`, `sourcePage`, y otros metadatos sin descartarlos. Las acotaciones se colocan después de la intervención especificada por `afterLine` y son visibles pero no narradas.
- Editor de texto y de tipo de intervención; editor de acotaciones y su posición.
- Idioma por obra (`ca-ES`, `es-ES`, `en-US`, `fr-FR`, `de-DE`, `it-IT`) para sintetizador y reconocimiento de voz. Selector de voces instaladas que coincidan con el idioma. Si no hay voz adecuada, el teléfono puede utilizar una voz incorrecta o fallar: comprueba **Ajustes Android → Texto a voz**.
- Identificación de personajes individuales y colectivos: `TOTES` incluye el elenco completo; `LOUISE, GABY, AUGUSTINE, MAMY` pertenece también a Louise. La aplicación no pronuncia las intervenciones de tu personaje, aunque aparezca acompañado de otros.
- En modo «Solo mis entradas», también se cuentan las réplicas colectivas.
- Persistencia de la configuración en IndexedDB y exportación/restauración de copias JSON.

## Límites de esta versión

- Los PDF con formatos complejos pueden seguir extrayéndose mal: se recomienda importar un JSON revisado. No se aplica OCR a PDFs escaneados.
- Las canciones se guardan y distinguen visualmente, pero el lector de voz **no canta** (lee el texto).
- Una intervención coral completa se reserva como turno del usuario si participa en ella. No se separan todavía las partes cantadas o habladas por cada intérprete.
- El reconocimiento de voz depende de Chrome/Android y puede requerir conexión. La coincidencia es aproximada.
- El guion y las correcciones no se sincronizan entre dispositivos: utiliza las copias JSON. No borres los datos de la app sin hacer una copia.

## Estructura de los archivos

- `index.html`: interfaz.
- `app.js`: importación, edición, almacenamiento y ensayo.
- `sw.js`: caché offline de archivos de la aplicación.
- `manifest.webmanifest` e `icon.svg`: instalación/icono PWA.
