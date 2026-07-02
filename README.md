# 4690 BASIC Video Generator

Generador de videos animados de código para capacitación en IBM 4690 BASIC.  
Aplicación web 100% del lado del cliente — sin servidor, sin build steps, solo abrir `index.html` en el navegador.

## Descripción

Esta herramienta simula el ciclo completo de edición, compilación, linkeo y ejecución de un programa BASIC en un entorno IBM 4690 OS, y permite:

- **Previsualizar** la animación completa en el navegador
- **Exportar video** en WebM (VP9) o MP4 (H.264) mediante captura de pantalla nativa

Está pensada para instructores y creadores de contenido que quieran generar demostraciones animadas de código de forma consistente y sin edición posterior.

## Archivos

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Estructura HTML de la interfaz |
| `styles.css` | Todos los estilos visuales |
| `app.js` | Lógica completa de la aplicación |

## Requisitos

- Navegador moderno (Chrome, Edge, Firefox, Safari)
- **Permisos de ventanas emergentes** habilitados para la grabación optimizada

## Modo de uso

### Panel lateral

El panel lateral contiene todo el control de la aplicación, organizado en pestañas.

#### Pestaña **Código**
- **Nombre del archivo**: nombre del archivo `.bas` que se mostrará en el editor
- **Código fuente**: editor de texto para escribir o pegar el código BASIC (con resaltado sintáctico en la previsualización/grabación)

#### Pestaña **Comandos**
- **Comando de compilación**: comando que se tipea en la terminal de compilación (ej. `.\BASIC.EXE .\Example3.bas`)
- **Salida del compilador**: texto multilínea que aparece como resultado de la compilación
- **Comando de linkeo**: comando del linker (opcional — dejar vacío para omitir)
- **Salida del linker**: texto multilínea con el resultado del linkeo
- **Prompt ejecución**: prompt del sistema 4690 OS (ej. `C:CURSO/>`)
- **Comando de ejecución**: nombre del programa a ejecutar (ej. `EXAMPLE1`)
- **Resultado/Output**: salida del programa ejecutado

#### Pestaña **Ajustes**
- **Tamaño de fuente**: escala la fuente del editor y terminales
- **Velocidades**: controlan la velocidad de escritura en editor, terminal y aparición del output
- **Pausas**: controlan las pausas entre fases, compilación simulada, comandos `DIR` y pausa final
- **Formato de video**: selector entre WebM (VP9, recomendado) y MP4 (H.264, si el navegador lo soporta)

#### Pestaña **Entorno**
- **Secuencia Boot**: texto que aparece antes de ejecutar el `.286` (simula el arranque del sistema)
- **Plantilla DIR PowerShell**: plantilla del comando `dir` en la terminal de compilación post-build. Soporta etiquetas:
  - `{{FILE_BAS}}`, `{{FILE_OBJ}}`, `{{FILE_286}}`, `{{FILE_SYM}}`
- **Plantilla DIR 4690 OS**: plantilla del `dir` en la terminal de ejecución. Soporta etiquetas:
  - `{{FILE_286_DOS}}`, `{{DATE_4690}}`, `{{TIME_4690}}`

#### Pestaña **Sistema**
- Exportar/Importar toda la configuración como archivo JSON

### Botones de acción

- **Previsualizar**: ejecuta la animación completa en el panel central sin grabar
- **Limpiar Pantalla**: limpia todo el contenido de los 3 paneles (editor, compilación y ejecución) y reinicia los indicadores de fase
- **Exportar Video**: 4 opciones de grabación —
  - **Grabar solo Editor**: graba únicamente el panel del editor
  - **Grabar solo Compilador**: graba únicamente la terminal de compilación/link
  - **Grabar solo Ejecución**: graba únicamente la terminal de ejecución 4690
  - **Grabar Todo (3 paneles)**: graba los 3 paneles simultáneamente
- **Detener**: detiene la previsualización o grabación en curso

### Grabación (popup optimizado)

Al hacer clic en cualquier botón de grabación:

1. Se abre una **ventana emergente** con las dimensiones exactas del contenido a grabar (700×620 para panel único, 1260×620 para los 3 paneles)
2. La ventana muestra **solamente los paneles** — sin sidebar, sin fondos decorativos, sin bordes
3. Aparece el diálogo nativo del navegador para **compartir la pestaña** (con la ventana emergente preseleccionada)
4. La animación comienza automáticamente y se graba la ventana
5. Al terminar, el video se descarga automáticamente y la ventana se cierra sola

### Formatos de video

- **WebM (VP9)**: formato por defecto. Compatible con todos los navegadores modernos que soportan `MediaRecorder`
- **MP4 (H.264)**: seleccionable desde Ajustes → Formato de video. Si el navegador no soporta H.264 en `MediaRecorder`, se usa WebM como fallback

Para MP4, el stream de video se redirige a través de un `<canvas>` para normalizar el formato de píxeles y evitar problemas de renderizado de texto con el códec H.264.

## Animación

La animación progresa a través de 4 fases visibles en los indicadores del panel lateral:

1. **Editor**: el código se tipea carácter por carácter con resaltado sintáctico y numeración de líneas
2. **Compilar**: se tipea el comando de compilación, se muestra la salida, se ejecuta `dir` para mostrar los archivos generados, y opcionalmente se linkea y se ejecuta otro `dir`
3. **Ejecutar**: se muestra la secuencia de boot, se ejecuta `dir`, se tipea el comando de ejecución y se muestra el output del programa
4. **Fin**: pausa final y la animación concluye

Cada `dir` tiene una pausa configurable antes de tipearse, y los prompts de las terminales permanecen visibles en todo momento.

### Resaltado sintáctico

El editor de código aplica resaltado en tiempo real mediante un tokenizador que reconoce:

- Palabras clave BASIC (`PRINT`, `FOR`, `IF`, `END`, `GOTO`, `DIM`, `CALL`, etc.)
- Strings delimitados por comillas dobles
- Comentarios (`!` y `REM`)
- Números
- Variables con sufijo (`$` para string, `%` para entero)
- Directivas (`%ENVIRON`)
- Operadores
- Etiquetas

## Configuración persistente

Toda la configuración (código, comandos, velocidades, pausas, plantillas, formato de video) se guarda automáticamente en `localStorage` ante cualquier cambio en los formularios. Al recargar la página, la configuración se restaura.

## Arquitectura técnica

- **HTML5 semántico** — sin frameworks, sin dependencias npm
- **CSS3** — variables CSS, glassmorphism, animaciones, layout flexbox
- **JavaScript ES6** — IIFE, async/await, AbortController, DOM APIs
- **MediaStream Recording API** — `getDisplayMedia` + `MediaRecorder` para captura de pantalla
- **Canvas API** — pipeline de canvas para normalización de píxeles en grabación MP4
- **Web Storage API** — persistencia de configuración en `localStorage`
- **File System Access API** — exportación/importación de configuración JSON

### Flujo de grabación

```
Botón de grabación
  → openRecorderPopup()
    → saveConfig() a localStorage
    → window.open('index.html?recorder=1&focus=...')
      → Popup detecta ?recorder=1
        → .recorder-popup (CSS: sidebar oculto, canvas fullscreen)
        → autoStartRecordingInPopup()
          → loadConfig()
          → focus-* class en canvas-wrapper
          → getDisplayMedia({preferCurrentTab, cursor:'never'})
            → Si MP4: canvas pipeline (video → canvas → captureStream)
            → MediaRecorder(stream, {mimeType, videoBitsPerSecond})
            → runAnimation()
              → Fase 1: Editor (typeCodeWithLineNumbers)
              → Fase 2: Compilar (typeLineInto + printMultilineInto)
              → Fase 3: Ejecutar (typeLineInto + printLineInto)
            → mediaRecorder.stop()
              → Blob → download → window.close()
```

### Flujo de previsualización

```
Previsualizar
  → runAnimation(abortController.signal)
    → resetCanvas()
    → Fase 1-2-3 (misma animación que en grabación)
    → Sin captura de pantalla
    → Sin descarga de video
```

## Notas

- El cursor del mouse se oculta automáticamente durante la grabación (tanto por `cursor: never` en `getDisplayMedia` como por `cursor: none !important` en CSS del popup)
- Si el bloqueador de ventanas emergentes impide abrir el popup, aparece una alerta indicando que se deben permitir popups para esta página
- El archivo de video se nombra automáticamente como `4690_basic_{focus}_{timestamp}.{ext}`

## Créditos

Desarrollado como herramienta interna para la creación de materiales de capacitación en IBM 4690 BASIC.
