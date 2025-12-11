## CurlParrot_perrito

Este proyecto sirve animaciones ASCII por HTTP, pensadas para clientes de terminal como `curl`. El servidor principal es `index.js` (Node). Las animaciones se leen desde carpetas con archivos de texto (frames), por ejemplo `frames/`, `pedro/`, `sexy/`, etc.

El servidor envía las líneas de cada frame en streaming, manteniendo la conexión abierta para simular una animación en la terminal.

## Resumen rápido
- Archivo principal: `index.js` — servidor HTTP que transmite frames.
- Carpeta por defecto: `frames/` — contiene los cuadros de la animación.
- Comandos: `npm start` (producción), `npm run dev` (nodemon para desarrollo).

## Requisitos
- Node.js (v14+ recomendada)
- npm

## Cómo ejecutar localmente
1. Instalar dependencias:

```bash
cd /ruta/al/proyecto
npm install
```

2. Iniciar el servidor:

- Modo producción:

```bash
npm start
```

- Modo desarrollo (auto-reload):

```bash
npm run dev
```

El servidor por defecto escucha en el puerto `3000` o en la variable de entorno `PARROT_PORT`.

## Uso (ejemplos con curl)

- Abrir la animación por defecto:

```bash
curl "http://localhost:3000"
```

- Voltear los frames:

```bash
curl "http://localhost:3000?flip=true"
```

- Elegir otra carpeta de animación (por ejemplo `pedro`):

```bash
curl "http://localhost:3000?folder=pedro"
```

- Cambiar la velocidad de la animación (delay en ms):

```bash
curl "http://localhost:3000?delay=40"
```

- Enviar la velocidad mediante header HTTP (útil con `curl -H`):

```bash
curl -H "X-Parrot-Delay: 120" "http://localhost:3000?folder=frames"
```

## Parámetros soportados

- `folder` — nombre de carpeta con frames (ej.: `frames`, `pedro`). Sólo se aceptan nombres seguros: `[A-Za-z0-9_-]`.
- `flip` — `true|false` — invierte (voltea) cada frame.
- `delay` — número en milisegundos entre frames (por defecto 80ms).
- `color` — `true|false|0|1|no|off` — cuando es `false`, la salida no usa colores.

Prioridad para el `delay`:
1. Query param `delay` (ej. `?delay=40`)
2. Header `X-Parrot-Delay` o `X-Delay`
3. Flag CLI `--delay` o variable de entorno `PARROT_DELAY`
4. Valor por defecto en el código (80ms)

## Añadir nuevas animaciones

1. Crear una carpeta en la raíz, por ejemplo `myparrot/`.
2. Añadir archivos por orden (`0.txt`, `1.txt`, `2.txt`, ...). Cada archivo contiene el ASCII-art del frame.
3. Consumir la animación:

```bash
curl "http://localhost:3000?folder=myparrot"
```

El servidor validará que la carpeta existe y que el nombre es seguro.

## Despliegue

La aplicación mantiene conexiones abiertas (streaming), por lo que plataformas que no soporten conexiones largas (ciertas serverless) no son ideales. Recomendaciones:

- Fly.io — funciona muy bien para mantener conexiones abiertas.
- Render o Railway — opciones sencillas.
- VPS / Docker — control completo.

Ejemplo de `Dockerfile` mínimo:

```dockerfile
FROM node:20-alpine
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
ENV PORT 3000
EXPOSE 3000
CMD ["node", "index.js"]
```

## Notas de seguridad y límites

- `folder` se valida para evitar directory traversal.
- Cada conexión de cliente mantiene recursos en el servidor; planifica la concurrencia según tu despliegue.

## Ideas / mejoras a implementar

- `loops` (int): detener la animación después de N ciclos.
- Soporte para archivos `.animation` que contengan múltiples frames en un solo fichero.
- Control de `rateLimit` / `maxClients` (requiere almacenamiento en memoria o Redis para producción).

Si quieres que implemente alguna de estas mejoras, dímelo y lo hago.

## Cómo funciona internamente (explicación técnica)

Esta sección describe las partes principales del código en `index.js`, el flujo de ejecución y las decisiones de diseño para que puedas extender o mantener el proyecto más fácilmente.

- Preload y cache de frames
	- `framesCache` (Map): cachea por nombre de carpeta un objeto { original: [frames], flipped: [frames] }.
	- Al inicio el servidor intenta precargar la carpeta `frames/` llamando a `loadFrames('frames')` dentro de un IIFE asíncrono.

- Carga de frames: `loadFrames(folder)`
	- Usa `mz/fs` para llamadas basadas en Promises (`readdir`, `readFile`).
	- Lee todos los archivos de la carpeta (según `fs.readdir`) y hace `Promise.all` de `fs.readFile` para cada archivo.
	- Convierte cada buffer a string y construye `original` (array de strings) y `flipped` (cada string invertido con `split('').reverse().join('')`).
	- Nota: `fs.readdir` no garantiza orden numérico; si tus frames están nombrados `0.txt, 1.txt, ...` y quieres orden seguro, añade un `files.sort()` con comparación numérica antes de mapear.

- Selección de color
	- `colorsOptions` contiene la paleta usada (por defecto: red, yellow, green, blue, magenta, cyan, white).
	- `selectColor(previousColor)` elige un índice aleatorio distinto a `previousColor` para evitar repetir el mismo color dos frames seguidos.
	- El coloreado se aplica usando la librería `colors` cuando `useColors` está activo.

- Parsing de flags/entorno
	- `parseCliArgs()` maneja `--delay 120` o `--delay=120` (valores pasados a `node index.js`).
	- `DEFAULT_DELAY` se determina en orden: CLI > variable `PARROT_DELAY` > undefined (después el código usa 80ms por defecto si no hay nada).

- Validación de la petición: `validateQuery(query)`
	- Extrae `flip` como boolean (`'true'`), `folder` sólo si cumple la regex `/^[a-zA-Z0-9_\-]+$/` (evita `../`), `delay` como número, `color` a través de `shouldUseColors()`.
	- Esto mitiga directory traversal y entradas malformadas.

- Manejo de la petición HTTP (flujo principal)
	1. El servidor rechaza peticiones que no parecen venir de `curl` (si `User-Agent` existe y NO incluye `curl` hace un 302 redirigiendo al repo). Esto mantiene el foco en clientes de terminal.
	2. Crea una `Readable` stream (con `_read = noop`) y `stream.pipe(res)` para que los `push()` envíen datos al cliente conectado.
	3. Analiza query params con `validateQuery(url.parse(req.url, true).query)`.
	4. Permite override de `delay` vía headers `X-Parrot-Delay` o `X-Delay` si el query param de `delay` no está presente.
	5. Determina `folderName` (por defecto `frames`) y busca en `framesCache`. Si no existe, valida que la carpeta existe (`fs.stat`) y llama `loadFrames(folderName)` para leer y cachear.
	6. Llama a `streamer(stream, { flip, frames, delay, color })` que devuelve el `interval` de `setInterval`.
	7. Registra `req.on('close', ...)` para `stream.destroy()` y `clearInterval(interval)` cuando el cliente cierra la conexión: limpieza necesaria para evitar leaks de memoria/timers.

- Implementación del `streamer(stream, opts)`
	- Toma `opts.frames` (original y flipped), `opts.flip` para decidir cuál usar, `opts.delay` y `opts.color`.
	- Calcula `delay` con prioridad: `opts.delay` -> `DEFAULT_DELAY` -> 80ms.
	- Crea un `setInterval` que cada tick:
		- Inserta ANSI codes para limpiar pantalla: `\x1b[2J\x1b[3J\x1b[H`.
		- Si `useColors`, selecciona color distinto al anterior y hace `stream.push(colors[color](frames[index]));`.
		- Si no, hace `stream.push(frames[index]);`.
		- Incrementa `index` modulando por `frames.length`.
	- Devuelve el ID del interval para que el caller pueda `clearInterval`.

- Manejo de errores
	- La lectura de frames y la lógica asíncrona está envuelta en try/catch (promesas), y al detectar problemas envía `500` o `404` según corresponda.
	- Si ocurre un error después de que ya se enviaron headers, se intenta `res.end(...)` dentro de un `try` para evitar excepciones adicionales.

- Dependencias clave
	- `mz/fs` — promisified fs helpers (readdir, readFile, stat).
	- `colors` — formatea texto con colores ANSI.
	- `http`, `url`, `path`, `stream` (nativos de Node).

- Puntos de extensión y mejoras (técnicas)
	- Ordenar archivos de `fs.readdir()` numéricamente antes de construir frames para evitar problemas de orden.
	- Añadir soporte para `loops`: hacer que `streamer` cuente vueltas y se `clearInterval` cuando alcanza N.
	- Implementar `palette`/`palette` param para personalizar `colorsOptions` por petición o por carpeta.
	- Servir frames desde archivos `.animation` (parsear delimitadores) o desde un JSON preprocesado.
	- Añadir tests unitarios para `validateQuery`, `shouldUseColors`, `loadFrames` (mock `fs`), y tests de integración que arranquen el servidor y usen `curl` o `supertest` para verificar streaming y limpieza.

- Consideraciones y edge-cases
	- Concurrencia: cada cliente produce un timer y mantiene la memoria de los frames (compartida via cache). Si hay muchos clientes simultáneos, vigila el uso de timers y la memoria.
	- Orden de frames: `fs.readdir()` puede devolver orden inesperado; ordenar por nombre o parsear índices evita cuadros fuera de secuencia.
	- Robustez del `flip`: el flipping actual invierte cada string; para algunos ASCII-art esto está bien, para otros quizá quieras transformaciones más sofisticadas.
	- Validación de contenido: podrías comprobar tamaños de frame/longitud para evitar que frames extremadamente grandes saturen el buffer.

---
Documento actualizado para incluir la explicación interna del servidor y puntos para extenderlo o probarlo.

---
Documento generado y actualizado en español para explicar el funcionamiento básico, parámetros de uso, ejemplos y despliegue.


