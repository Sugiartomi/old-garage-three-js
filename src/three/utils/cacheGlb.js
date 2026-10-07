const CACHE_NAME = 'old-garage-glb-v1'
const memoryBuffers = new Map()

function absoluteUrl(url) {
  return new URL(url, window.location.href).href
}

function abortError() {
  const error = new Error('Aborted')
  error.name = 'AbortError'
  return error
}

async function storeBuffer(href, arrayBuffer) {
  memoryBuffers.set(href, arrayBuffer.slice(0))
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(CACHE_NAME)
    await cache.put(
      href,
      new Response(arrayBuffer.slice(0), {
        headers: { 'Content-Type': 'model/gltf-binary' },
      }),
    )
  } catch {
    // Kuota atau mode privat: muat dari jaringan saja.
  }
}

/**
 * Ambil GLB dari memori sesi, lalu Cache API, baru jaringan.
 * Refresh berikutnya tidak mengunduh file yang sama lagi.
 */
export async function loadGlbBuffer(url, onProgress, signal) {
  if (signal?.aborted) throw abortError()

  const href = absoluteUrl(url)
  const report = (progress, phase) => onProgress?.({ progress, phase })
  const remembered = memoryBuffers.get(href)
  if (remembered) {
    report(1, 'cache')
    return remembered.slice(0)
  }

  if ('caches' in window) {
    try {
      const cache = await caches.open(CACHE_NAME)
      const hit = await cache.match(href)
      if (hit) {
        const buffer = await hit.arrayBuffer()
        if (signal?.aborted) throw abortError()
        memoryBuffers.set(href, buffer.slice(0))
        report(1, 'cache')
        return buffer
      }
    } catch (error) {
      if (error?.name === 'AbortError') throw error
    }
  }

  const response = await fetch(href, { signal })
  if (!response.ok) throw new Error(`HTTP ${response.status} for ${href}`)

  const total = Number(response.headers.get('content-length')) || 0
  if (!response.body) {
    const buffer = await response.arrayBuffer()
    if (signal?.aborted) throw abortError()
    report(1, 'download')
    await storeBuffer(href, buffer)
    return buffer
  }

  const reader = response.body.getReader()
  const onAbort = () => {
    reader.cancel().catch(() => {})
  }
  signal?.addEventListener('abort', onAbort, { once: true })

  const chunks = []
  let loaded = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      if (signal?.aborted) throw abortError()
      chunks.push(value)
      loaded += value.byteLength
      if (total > 0) report(Math.min(loaded / total, 0.99), 'download')
      else report(0, 'unknown')
    }
  } finally {
    signal?.removeEventListener('abort', onAbort)
  }

  const bytes = new Uint8Array(loaded)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }

  const buffer = bytes.buffer
  report(1, 'download')
  await storeBuffer(href, buffer)
  return buffer
}

export async function pruneGlbCache(urls) {
  if (!('caches' in window)) return
  try {
    const cache = await caches.open(CACHE_NAME)
    const keep = new Set(urls.map((url) => absoluteUrl(url)))
    const keys = await cache.keys()
    await Promise.all(
      keys.filter((request) => !keep.has(request.url)).map((request) => cache.delete(request)),
    )
  } catch {
    // Abaikan. Muat berikutnya tetap jalan.
  }
}
