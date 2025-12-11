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

---
Documento generado y actualizado en español para explicar el funcionamiento básico, parámetros de uso, ejemplos y despliegue.


