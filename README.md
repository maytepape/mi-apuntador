# Mi Apuntador v2.5 — reconocimiento y diagnóstico

Se conserva IndexedDB y la estructura PWA de v2.4. Esta versión modifica únicamente el reconocimiento de voz y añade un registro de diagnóstico en Ajustes.

## Ver las trazas

1. En Chrome Android, abre el ensayo de Louise y pulsa Hablar o permite que se active automáticamente.
2. Si observas repeticiones o reinicios, pulsa Pausar.
3. Entra en Ajustes → Diagnóstico del micrófono (v2.5) → Copiar registro.
4. Pega el registro en la conversación. Las trazas no contienen el texto literal del guion ni el audio.

## Cambios

- Una única instancia activa y eventos antiguos ignorados.
- Resultados parciales actualizan la vista; solo se consolida el resultado final una vez por instancia.
- Solapamientos de varias palabras se eliminan al consolidar sesiones consecutivas.
- Se respeta el ajuste de 2–15 segundos entre reintentos.
- Máximo dos reinicios consecutivos sin voz y máximo doce aperturas por turno.
- Registro de eventos limitado a 350 entradas, solo en memoria temporal.

> Nota: los servicios de reconocimiento web pueden cerrar sesiones por su cuenta. La corrección debe validarse en Chrome Android. Haz copia de seguridad de tus obras antes de actualizar.

# Mi Apuntador v2.4 — estabilidad de reconocimiento

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
   git commit -m "Mi Apuntador v2.4: reconocimiento estable"
   git push origin v2.1
   ```
4. GitHub Pages solo sirve directamente **una rama por repositorio** bajo el endpoint configurado. Subir esta versión a `v2.1` no altera `main`, pero solo se publicará en la web si Pages usa esa rama o si existe un workflow específico para desplegarla en otra ruta.
5. Abre la URL con Chrome Android. El service worker usa caché `mi-apuntador-v2.4`. Si ves la pantalla anterior, recarga tras completarse la publicación.

**Privacidad**: no subas los guiones ni los JSON de una obra a un repositorio público; impórtalos localmente desde la PWA.

## Comprobaciones recomendadas

- Primera instalación sin obras → pantalla de bienvenida → importar JSON → revisar → validar → Inicio con escenas.
- Actualización con obras de v2.1 → portada de ensayo sin reimportar obras y con progreso anterior.
- Ajustes → modo Claro, Oscuro y Automático → cerrar/reabrir → se mantiene preferencia.
- Ajustes → Gestionar obras → editar → volver → seleccionar otra obra → Inicio actualizado.
- Preparar y reanudar ensayo → Louise y `TOTES` continúan marcados como turnos propios.

## Limitaciones

El reconocimiento de voz se basa en la API del navegador, que puede necesitar red, y se ha probado principalmente para Chrome Android en sesiones anteriores. La síntesis de voz no canta. Los fragmentos de diferentes idiomas necesitan revisión manual. Las obras se conservan **por origen y navegador** en IndexedDB; la misma aplicación en otra ruta web o navegador puede tener una base de datos distinta. Realiza copias de seguridad regulares.


## Versión 2.3

- Botón **⏸ Pausar / ▶ Reanudar** durante el ensayo: detiene la lectura, el reconocimiento y los avances automáticos. Al reanudar comienza de nuevo la intervención actual (no desde mitad de frase).
- Colores estables por personaje en el diálogo y en la configuración de voces.
- Contador de intervenciones propias realizadas y pendientes, incluidas las compartidas. Solo aumenta cuando se completa el turno; saltar a otra intervención no lo incrementa. El contador cubre las escenas seleccionadas para el ensayo.
- **Preparar ensayo → Voces por personaje:** permite elegir distintas voces disponibles en Android para el idioma principal; si no hay suficientes se reutiliza la general. Las voces se guardan por obra.
- Misma IndexedDB y esquema previo: no borra las obras ni las preferencias.
- Importante: Chrome Android puede ofrecer una única voz catalana; la asignación de voces depende de las voces reales del dispositivo.


## v2.4: estabilidad de reconocimiento

- Los resultados de SpeechRecognition se tratan como instantáneas acumulativas por sesión, sin duplicación de hipótesis intermedias o finales.
- Se mantiene separada la transcripción confirmada al iniciar una nueva sesión.
- Se eliminan los cortes periódicos cortos del micrófono; solo hay un límite de seguridad de 30 s sin eventos.
- Los reinicios llevan una espera y se detienen tras dos sesiones consecutivas sin voz; «Hablar» permite continuar.
- Al pausar, terminar, cambiar de turno o salir se invalidan todos los eventos anteriores.

**Importante:** Chrome puede cerrar sesiones por sí mismo; no es posible garantizar escucha perpetua. Se requiere prueba con micrófono real en Chrome Android.
