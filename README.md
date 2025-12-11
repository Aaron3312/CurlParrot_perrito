## CurlParrot_perrito

Este repositorio sirve una animación tipo "parrot" por HTTP para clientes tipo `curl` (o terminales). El servidor principal es `index.js` y las animaciones se leen desde carpetas de frames (por ejemplo `frames/`).

## Contenidos importantes
- `index.js` — servidor Node que transmite frames por HTTP.
- `package.json` — scripts: `npm start` (node index.js) y `npm run dev` (nodemon).
- `frames/` — carpeta por defecto con los frames de la animación.

## Cómo ejecutar localmente
1. Instala dependencias:

```bash
cd /ruta/al/proyecto
npm install
```

2. Arranca el servidor:

- Modo normal:

```bash
npm start
```

- Modo desarrollo (auto-reload si cambias archivos):

```bash
npm run dev
```

Por defecto el servidor escucha en el puerto `3000` (o en la variable de entorno `PARROT_PORT`). En consola verás algo como:

```
Listening on localhost:3000
```

3. Ver la animación con `curl` (usa un cliente tipo terminal para ver el streaming):

```bash
curl "http://localhost:3000"
```

Para voltear los frames:

```bash
curl "http://localhost:3000?flip=true"
```

Seleccionar otra carpeta de animación (nueva funcionalidad):

```bash
curl "http://localhost:3000?folder=sexy"
```

También se soporta `delay` en milisegundos (velocidad entre frames):

```bash
curl "http://localhost:3000?folder=sexy&delay=40"
```

Nota: el parámetro `folder` sólo acepta nombres sencillos (letras, números, guión bajo y guión medio). Esto evita rutas que salgan del directorio del proyecto.

## Query params / Flags HTTP soportadas
- `folder` — nombre de la carpeta (relativa a la raíz del proyecto) que contiene los frames. Ej.: `frames`, `pedro`.
- `flip` — `true|false` — si es `true` la animación se sirve volteada.
- `delay` — entero en ms, retraso entre frames (por defecto 80).
 - `color` — `true|false|0|1|no|off` — si es `false` los frames se sirven sin coloreado (texto plano). Por defecto está activado.

Parámetros no implementados (todavía):
- `loops` — detener después de N ciclos (si lo quieres, puedo implementarlo).
- `orientation` — variantes de animación (requiere diseño de variantes en carpetas).

Si envías otros parámetros en la query serán ignorados por ahora.

## Cómo añadir nuevos personajes / animaciones
Hay dos formas comunes para añadir animaciones a este proyecto:

### 1) Carpeta de frames (soportado aquí)
1. Crea una carpeta en la raíz del proyecto, por ejemplo `myparrot/`.
2. Añade los archivos de frame en orden (por ejemplo `0.txt`, `1.txt`, `2.txt`, ...). Los archivos pueden ser `.txt` y contener ASCII art.
3. Desde `curl` solicita la carpeta:

```bash
curl "http://localhost:3000?folder=myparrot"
```

El servidor valida que el nombre de carpeta sea seguro (solo `[A-Za-z0-9_-]`) y que exista.

### 2) Archivo `.animation` estilo `terminal-parrot` (opcional)
Este repositorio NO carga automáticamente el formato `.animation` que usa otro proyecto (`terminal-parrot`). Si quieres compatibilidad, puedo añadir un loader que convierta `.animation` a frames dinámicamente. El formato general de `.animation` es:

```
description: Nombre de la animación
!--FRAME--!
[ Frame 1 ]
!--FRAME--!
[ Frame 2 ]
!--FRAME--!

```

Si te interesa, implemento la lectura de `.animation` en el servidor para permitir poner archivos `.animation` en una carpeta de configuración.

## Despliegue (opciones recomendadas)
Estas recomendaciones tienen en cuenta que la app mantiene conexiones HTTP abiertas (streaming). Plataformas serverless puras no son ideales.

- Recomendación principal: Fly.io — soporta contenedores que mantienen conexiones abiertas y es muy sencillo de usar para apps Node.
- Alternativas: Render, Railway (fáciles), Google Cloud Run (si empaquetas en contenedor), VPS (DigitalOcean) si quieres control.

### Docker (base para deploy)
Archivo `Dockerfile` sugerido:

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

Esto empaqueta la app con las carpetas de frames incluidas.

### Deploy rápido a Fly.io (resumen)
1. Instala `flyctl`.
2. Desde la raíz: `flyctl launch` y sigue las instrucciones (o `flyctl deploy` si ya creaste la app).
3. Opcional: `flyctl secrets set PARROT_PORT=3000` para configurar puerto.

### Deploy a Render
1. Conecta el repo en Render.
2. New -> Web Service. Build: `npm ci`. Start: `node index.js`.

### Deploy a Google Cloud Run
1. Construye y sube una imagen: `gcloud builds submit --tag gcr.io/PROJECT_ID/curlparrot`.
2. `gcloud run deploy curlparrot --image gcr.io/PROJECT_ID/curlparrot --platform managed --region=REGION --allow-unauthenticated --port=3000`

Consideraciones: Cloud Run permite streaming, pero tiene límites de timeout configurables (hasta 60 min). Para conexiones indefinidas preferir Fly o VPS.

## Seguridad y límites
- El parámetro `folder` se valida para evitar traversal (`../`).
- Cada cliente `curl` mantiene una conexión; planifica la capacidad según concurrencia esperada.

## Ejemplos rápidos
- Iniciar localmente:

```bash
npm install
npm start
curl "http://localhost:3000?folder=frames&delay=80"
```

- Petición sin colores:

```bash
curl "http://localhost:3000?folder=frames&color=false"
```

- Deploy con Docker (local build):

```bash
docker build -t curlparrot .
docker run -p 3000:3000 curlparrot
```

## Flags de configuración sugeridas
Abajo hay ideas de flags/query params que podríamos añadir para ampliar el control de la animación desde el cliente (o para configuraciones por servidor). Para cada flag indico una breve descripción y un ejemplo de uso con `curl`.

- `loops` (int) — hacer que la animación termine después de N repeticiones del conjunto de frames.

```bash
curl "http://localhost:3000?folder=frames&loops=10"
```

- `orientation` (string) — seleccionar una variante de animación (por ejemplo `aussie`, `reverse`, `normal`). Requeriría que la app tenga variantes disponibles por carpeta o un mapeo interno.

```bash
curl "http://localhost:3000?folder=frames&orientation=aussie"
```

- `palette` (string) — seleccionar una paleta de colores o lista de colores separados por comas (ej. `red,green,white`). Útil para personalizar los colores usados.

```bash
curl "http://localhost:3000?folder=frames&palette=red,green,cyan"
```

- `randomColors` (`true|false`) — si es `true` escoger colores al azar para cada frame (comportamiento actual); si es `false` usar una rotación determinista o la paleta indicada.

```bash
curl "http://localhost:3000?folder=frames&randomColors=false"
```

- `startFrame` (int) — iniciar la animación desde un frame específico (por ejemplo `startFrame=5`).

```bash
curl "http://localhost:3000?folder=frames&startFrame=5"
```

- `maxClients` (int) — parámetro de servidor (no público) para limitar el número de conexiones concurrentes; si se excede, devolver 429.

- `rateLimit` (int) — número de peticiones por minuto por IP; útil para evitar abuso en despliegues públicos.

- `authToken` (string) — permitir poner un token para acceder a animaciones privadas (ej. `?authToken=XYZ`).

Estas flags son propuestas; algunas requieren cambios en `index.js` (por ejemplo `loops` y `orientation`), otras son configuraciones de infraestructura (por ejemplo `maxClients` o `rateLimit`). Dime cuáles quieres que implemente y lo hago: `loops` y `palette` son cambios relativamente pequeños; `rateLimit`/`maxClients` requieren diseño (in-memory counters o integración con Redis).

## ¿Quieres que añada más? (opciones)
- Implementar `loops` para detener la animación después de N repeticiones.
- Soportar archivos `.animation` como fuente de animaciones.
- Añadir un `README` separado por animación o un script de validación para frames.

Si quieres que haga alguno de estos cambios y lo pruebe, dímelo y lo implemento y pruebo en esta rama.

