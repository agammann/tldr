import { createServer } from 'node:http';
import { Readable } from 'node:stream';
import worker from './dist/server/index.js';

const port = Number(process.env.PORT || 5192);
createServer(async (incoming, outgoing) => {
  const controller = new AbortController();
  outgoing.on('close', () => { if (!outgoing.writableEnded) controller.abort(); });
  try {
    const request = new Request(`http://127.0.0.1:${port}${incoming.url}`, {
      method: incoming.method, headers: incoming.headers, signal: controller.signal,
      ...(!['GET', 'HEAD'].includes(incoming.method) ? { body: Readable.toWeb(incoming), duplex: 'half' } : {}),
    });
    const response = await worker.fetch(request);
    outgoing.writeHead(response.status, Object.fromEntries(response.headers));
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch { if (!outgoing.destroyed) { outgoing.writeHead(500); outgoing.end('Preview request failed.'); } }
}).listen(port, '127.0.0.1', () => console.log(`tldr preview: http://127.0.0.1:${port}`));
