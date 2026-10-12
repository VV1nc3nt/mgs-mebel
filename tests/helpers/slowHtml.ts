import http from 'node:http'
import type { AddressInfo } from 'node:net'

/** First bytes of the page that arrive slowly; the first screens of the checked pages end before. */
const SLOW_BYTES = 48 * 1024
const CHUNK = 1024
const CHUNK_MS = 20

/**
 * A proxy in front of the site that sends the HTML of a page slowly (1 KB / 20 ms, uncompressed)
 * while styles, scripts and fonts pass at full speed — the case of a slow network with the site's
 * static files already cached. Chrome then paints the page from a partly received document, every
 * time. Network throttling in DevTools slows the styles too and the compressed page arrives
 * before them, so it shows such a frame only now and then. Past SLOW_BYTES the rest goes at once.
 */
export async function slowHtmlProxy(target = 'http://localhost:3000') {
  const { hostname, port } = new URL(target)
  const server = http.createServer((req, res) => {
    const html = req.method === 'GET' && (req.headers.accept ?? '').includes('text/html')
    const headers = { ...req.headers, host: `${hostname}:${port}` }
    if (html) headers['accept-encoding'] = 'identity'
    const upstream = http.request(
      { hostname, port, path: req.url, method: req.method, headers },
      (response) => {
        res.writeHead(response.statusCode ?? 502, response.headers)
        if (!html) {
          response.pipe(res)
          return
        }
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => {
          const body = Buffer.concat(chunks)
          let sent = 0
          const tick = () => {
            if (sent >= SLOW_BYTES) {
              res.end(body.subarray(sent))
              return
            }
            res.write(body.subarray(sent, sent + CHUNK))
            sent += CHUNK
            if (sent < body.length) setTimeout(tick, CHUNK_MS)
            else res.end()
          }
          tick()
        })
      },
    )
    upstream.on('error', () => res.destroy())
    req.pipe(upstream)
  })
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))
  return {
    origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}`,
    close: () =>
      new Promise<void>((resolve) => {
        server.closeAllConnections()
        server.close(() => resolve())
      }),
  }
}
