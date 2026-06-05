# Dual Captions for Streaming

Idioma: [English](README.md) | Español | [Português](README.pt-BR.md) | [Deutsch](README.de.md)

Este fork es una extensión de Chrome Manifest V3, sin proceso de build, para mostrar subtítulos traducidos dobles en Disney+ y Netflix.

La extensión activa está en `extension/`. Carga esa carpeta directamente en Chrome. Este fork no usa el flujo de build archivado del proyecto original.

## Qué Hace

- Muestra dos líneas de subtítulos traducidos al mismo tiempo.
- Usa alemán y portugués brasileño como salidas predeterminadas.
- Usa la traducción integrada de Chrome cuando la API experimental Translator está disponible.
- Soporta Disney+ capturando segmentos WebVTT desde solicitudes de red.
- Soporta Netflix leyendo el texto visible de los subtítulos nativos de Netflix.
- Oculta visualmente la capa nativa de subtítulos de Netflix, pero la mantiene habilitada como texto fuente.
- Mantiene el overlay traducido visible en pantalla completa.
- Permite mover el overlay y ajustar tamaño, color del texto, color de fondo y opacidad.

## Instalación

1. Abre `chrome://extensions` en Chrome.
2. Activa `Modo desarrollador`.
3. Haz clic en `Cargar descomprimida`.
4. Selecciona la carpeta `extension/` de este repositorio.
5. Abre Disney+ o Netflix e inicia un video.

Hay notas más detalladas sobre Chrome AI en [`extension/README.md`](extension/README.md).

## Activar Traducción Con Chrome AI

![Flags de Chrome Prompt API activados](extension/screenshots/chrome%20prompt%20api%20enable.png)

1. Abre `chrome://flags`.
2. Configura `Prompt API for Gemini Nano` como `Enabled Multilingual`.
3. Configura `Prompt API for Gemini Nano with Multimodal Input` como `Enabled`.
4. Si ves `Translation API streaming split by sentence`, déjalo como `Default`; está relacionado, pero no es el switch requerido.
5. Reinicia Chrome, recarga la extensión unpacked y actualiza Disney+ o Netflix.

## Guía Para Netflix

1. Inicia un video en Netflix.
2. Abre el menú de subtítulos de Netflix.
3. Selecciona subtítulos en `English`. No selecciones `None`.
4. La extensión lee ese texto en inglés, oculta los subtítulos nativos de Netflix y muestra el overlay traducido.

### Paso 1: Selecciona Subtítulos En Inglés En Netflix

![Seleccionar subtítulos en inglés en Netflix](extension/screenshots/netflix%20choosing%20eng%20sub%20so%20it%20works.png)

### Paso 2: Usa El Overlay Traducido

![Overlay traducido funcionando en Netflix](extension/screenshots/netflix%20working%20well.png)

## Guía Para Disney+

1. Inicia un video en Disney+.
2. Activa los subtítulos fuente, preferiblemente en inglés.
3. Si los subtítulos están desincronizados por la línea de tiempo con anuncios, escribe el tiempo visible del programa en el campo de sync.
4. Haz clic en `Sync`.

### Overlay De Disney+ Funcionando

![Overlay traducido funcionando en Disney+](extension/screenshots/disney%20working%20well.png)

### Si Los Subtítulos De Disney+ Están Desincronizados

![Subtítulos de Disney+ desincronizados](extension/screenshots/disney%20out%20of%20sync.png)

### Después De La Sincronización Manual

![Sincronización manual de Disney+ corregida](extension/screenshots/disney%20sync.png)

## Limitaciones Actuales

- Los subtítulos nativos de Netflix deben permanecer habilitados porque todavía no hay parser de subtítulos de red para Netflix.
- Las capas de subtítulos basadas en imagen de Netflix no son legibles en este MVP.
- La traducción integrada de Chrome depende de APIs experimentales y disponibilidad del modelo local.
- Disney+ puede cambiar hosts o formatos de subtítulos, lo que puede requerir actualizaciones del parser.
- El sistema de build antiguo y los directorios legacy vienen del proyecto original y no son el camino activo de esta extensión.

## Estructura Del Proyecto

- `extension/`: extensión MV3 activa.
- `extension/src/content.js`: overlay, configuración, detección de fuente, sync y coordinación de traducción.
- `extension/src/background.js`: captura de solicitudes de Disney+ y carga de segmentos de subtítulos.
- `extension/src/page-translation-bridge.js`: puente en el mundo principal para las APIs integradas de Chrome AI.
- `extension/src/disneyplus/`: parser WebVTT y almacén de subtítulos.
- `extension/screenshots/`: capturas para el README.

## Atribución

Este repositorio es un fork del proyecto original `dual-captions` de Mike Steele. El proyecto original fue archivado upstream en 2022; este fork se enfoca en un flujo MV3 separado para Disney+ y Netflix.

## Licencia

MIT
