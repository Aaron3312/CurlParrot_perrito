const fs = require('mz/fs');
const path = require('path');
const http = require('http');
const url = require('url');
const { Readable } = require('stream');
const colors = require('colors/safe');

// Frames cache keyed by folder name. Each value: { original: [...], flipped: [...] }
const framesCache = new Map();

const loadFrames = async (folder) => {
  const framesPath = path.join(process.cwd(), folder);
  const files = await fs.readdir(framesPath);

  const original = await Promise.all(files.map(async (file) => {
    const frame = await fs.readFile(path.join(framesPath, file));
    return frame.toString();
  }));

  const flipped = original.map(f => f.toString().split('').reverse().join(''));

  return { original, flipped };
};

// Preload default 'frames' directory if available
(async () => {
  try {
    const defaultFrames = await loadFrames('frames');
    framesCache.set('frames', defaultFrames);
  } catch (err) {
    console.log('Warning: could not preload default frames directory `frames`');
  }
})();

const colorsOptions = [
  'red',
  'yellow',
  'green',
  'blue',
  'magenta',
  'cyan',
  'white'
];

const colorsOptionsW = ['white', 'white', 'white', 'white', 'white', 'white', 'white'];




const numColors = colorsOptions.length;
const selectColor = previousColor => {
  let color;

  do {
    color = Math.floor(Math.random() * numColors);
  } while (color === previousColor);

  return color;
};

// --- simple CLI flag / env parsing for default delay ---
const parseCliArgs = () => {
  const args = process.argv.slice(2);
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === '--delay' || a === '-d') {
      const next = args[i + 1];
      if (next && !next.startsWith('-')) {
        out.delay = Number(next);
        i++;
      }
    } else if (a.startsWith('--delay=')) {
      out.delay = Number(a.split('=')[1]);
    }
  }
  return out;
};

const cli = parseCliArgs();
const DEFAULT_DELAY = (() => {
  if (cli.delay !== undefined && !Number.isNaN(cli.delay)) return cli.delay;
  if (process.env.PARROT_DELAY) {
    const n = Number(process.env.PARROT_DELAY);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
})();

if (DEFAULT_DELAY !== undefined) {
  console.log(`Using default animation delay: ${DEFAULT_DELAY}ms`);
}

const streamer = (stream, opts) => {
  let index = 0;
  let lastColor;
  const { original, flipped } = opts.frames;
  const frames = opts.flip ? flipped : original;
  const delay = (opts.delay !== undefined && !Number.isNaN(Number(opts.delay)))
    ? Number(opts.delay)
    : (DEFAULT_DELAY !== undefined ? DEFAULT_DELAY : 80);
  const useColors = opts.color !== false;

  return setInterval(() => {
  // clear the screen
  stream.push('\x1b[2J\x1b[3J\x1b[H');

    if (useColors) {
      const newColor = lastColor = selectColor(lastColor);
      stream.push(colors[colorsOptions[newColor]](frames[index]));
    } else {
      stream.push(frames[index]);
    }

    index = (index + 1) % frames.length;
  }, delay);
};

// decide whether to use colors based on query param
const shouldUseColors = (colorParam) => {
  if (colorParam === undefined || colorParam === null) return true;
  const s = String(colorParam).toLowerCase();
  return !(s === 'false' || s === '0' || s === 'no' || s === 'off');
};

const validateQuery = (query) => {
  const flip = String(query.flip).toLowerCase() === 'true';

  // sanitize folder name: allow simple folder names only (no ../)
  const rawFolder = query.folder;
  let folder;
  if (rawFolder && typeof rawFolder === 'string') {
    // only allow alphanumeric, underscore, dash
    if (/^[a-zA-Z0-9_\-]+$/.test(rawFolder)) {
      folder = rawFolder;
    }
  }

  const delay = query.delay ? Number(query.delay) : undefined;
  const color = shouldUseColors(query.color);

  return { flip, folder, delay, color };
};

const server = http.createServer((req, res) => {
  if (req.url === '/healthcheck') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({status: 'ok'}));
  }

  if (
    req.headers &&
    req.headers['user-agent'] &&
    !req.headers['user-agent'].includes('curl')
  ) {
    res.writeHead(302, { Location: 'https://github.com/Aaron3312/CurlParrot_perrito.git' });
    return res.end();
  }

  const stream = new Readable();
  stream._read = function noop() {};
  stream.pipe(res);

  const q = validateQuery(url.parse(req.url, true).query);
  // allow overriding delay via HTTP header so curl can set it with -H "X-Parrot-Delay: 120"
  const headerDelay = req.headers['x-parrot-delay'] || req.headers['x-delay'];
  if ((q.delay === undefined || q.delay === null) && headerDelay) {
    const n = Number(headerDelay);
    if (!Number.isNaN(n)) q.delay = n;
  }
  const folderName = q.folder || 'frames';

  // get frames (from cache or load)
  (async () => {
    try {
      let framesObj = framesCache.get(folderName);
      if (!framesObj) {
        const candidatePath = path.join(process.cwd(), folderName);
        // ensure directory exists
        const stat = await fs.stat(candidatePath).catch(() => null);
        if (!stat || !stat.isDirectory()) {
          res.writeHead(404, { 'Content-Type': 'text/plain' });
          res.end('Frames folder not found');
          return;
        }

        framesObj = await loadFrames(folderName);
        framesCache.set(folderName, framesObj);
      }

  const interval = streamer(stream, { flip: q.flip, frames: framesObj, delay: q.delay, color: q.color });

      req.on('close', () => {
        stream.destroy();
        clearInterval(interval);
      });
    } catch (err) {
      console.error('Error serving frames:', err);
      if (!res.headersSent) res.writeHead(500, { 'Content-Type': 'text/plain' });
      try { res.end('Server error loading frames'); } catch (e) {}
    }
  })();
});

const port = process.env.PARROT_PORT || 3000;
server.listen(port, err => {
  if (err) throw err;
  console.log(`Listening on localhost:${port}`);
});
