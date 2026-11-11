# Mi Apuntador v2.7 — Corrección de reconocimiento y modo Normal

Actualización sobre la v2.6. Conserva IndexedDB y preferencias existentes.

## Correcciones
- Reconstruye los resultados acumulativos de SpeechRecognition de Chrome Android: las hipótesis crecientes se sustituyen en vez de concatenarse.
- Conserva fragmentos independientes de voz sin repetir cada hipótesis final.
- Evita iniciar el mismo turno otra vez por pulsaciones duplicadas o renderizados; «Hablar» continúa un turno pendiente sin borrar el texto confirmado.
- La función STOP_ALL anota ahora el motivo del cierre; TURN_START registra su origen, modo y visibilidad del texto para diagnosticar reinicios.
- El modo Normal muestra siempre el parlamento propio. Los demás modos mantienen las reglas de la v2.6.
- Persistencia y todas las funciones previas, sin migración destructiva.

## Pruebas de Android
1. Importa o reutiliza la obra y elige Normal. Comprueba que el parlamento propio aparece desde el inicio.
2. Recita «No ha parat d'explicar la mateixa història...»: la transcripción no debe duplicarse a cada resultado.
3. Comprueba que el indicador de escucha no parpadea por reinicios no solicitados.
4. Si hay un fallo, copia Ajustes → Diagnóstico del micrófono (no almacena transcripciones).

## Publicación
Descomprime la carpeta mi-apuntador y reemplaza los archivos en la rama pruebas; nunca sobrescribas la carpeta .git.

# Mi Apuntador v2.7 — modos de ensayo diferenciados

**Basada en v2.5**, conserva su controlador de reconocimiento de voz, trazas de diagnóstico, síntesis por personajes, colores, pausa, idiomas por fragmentos, barra de progreso, almacenamiento IndexedDB (`mi-apuntador-db`), obras importadas y preferencias. No borres los datos del navegador al actualizar.

## Modos

| Modo | Mis frases | Transcripción | Ayudas | Reproducción |
|---|---|---|---|---|
| Normal | Visibles | Visible | No hacen falta | Flujo de réplicas habitual |
| Memorización | Ocultas | Visible | Pistas graduales y Ver texto | Flujo habitual |
| Función completa | Ocultas | Oculta (internamente sigue reconociendo) | Solo si solicitas Pista o Ver texto | Flujo continuo, sin porcentaje visible |
| Solo mis entradas | Ocultas | Visible | Pistas graduales y Ver texto | Solo tu turno y su última réplica previa en la misma escena |

En todos los modos se conservan **He terminado**, pausa/reanudación, lectura automática, escucha de voz si está habilitada, réplica anterior, cambio de velocidad y salto entre intervenciones. En **Función completa**, la aplicación no muestra transcripción ni porcentaje de coincidencia, pero puede avanzar cuando reconoce el texto completo. Se mantiene el botón «He terminado» como alternativa cuando Chrome no pueda reconocerlo.

**Contador corregido:** pulsar «Siguiente» para saltarse un turno propio ya no lo marca como realizado. Solo cuentan las intervenciones terminadas mediante «He terminado» o coincidencia de reconocimiento. La evaluación de voz continúa siendo aproximada.

## Actualizar GitHub Pages (rama `pruebas`)

1. Exporta una copia de seguridad desde Ajustes → Gestionar obras.
2. Extrae el ZIP y copia los seis archivos de `mi-apuntador/` a la raíz del repositorio.
3. En la carpeta del repositorio, usa:

```bash
git switch pruebas
git pull --ff-only origin pruebas
# Sustituye los archivos por los del ZIP
git add index.html app.js sw.js manifest.webmanifest icon.svg README.md
git commit -m "Mi Apuntador v2.7: modos de ensayo"
git push origin pruebas
```

GitHub Pages publica solo la rama seleccionada en Settings → Pages. `main` no se altera.

## Pruebas recomendadas

1. Misma intervención de Louise en Normal (texto visible) y Memorización (oculto, pista y revelar).
2. Función completa: sin transcript visible ni porcentaje, pero controles disponibles a demanda.
3. Solo mis entradas: no reproduce parlamentos largos ajenos a las entradas de Louise; mantiene la última réplica de otro personaje que la precede en su escena.
4. Pulsar «Siguiente» sin hablar: el contador NO debe sumar esa intervención.
5. Verificar Ajustes → Diagnóstico del micrófono (v2.5) y obras/progreso existentes.

**Limitaciones:** reconocimiento y voces siguen sujetos a Chrome Android. No se ha realizado un ensayo físico con micrófono real en esta compilación. No subas guiones al repositorio público.

---

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
