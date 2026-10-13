import { routeApi } from '../api/router'
import type { Bindings } from '../api/_lib/http'

declare const STATIC_ASSETS: Record<string, { type: string; body: string }>
export default {
  async fetch(request: Request, bindings: Bindings): Promise<Response> {
    const url = new URL(request.url)
    if (url.pathname.startsWith('/api/')) return routeApi(request, bindings)
    if (request.method !== 'GET' && request.method !== 'HEAD') return new Response('Method not allowed', { status: 405 })
    const path = ['/', '/check', '/share-target'].includes(url.pathname) ? '/index.html' : url.pathname
    const asset = STATIC_ASSETS[path]
    if (!asset) return new Response('Not found', { status: 404 })
    const body = Uint8Array.from(atob(asset.body), c => c.charCodeAt(0))
    return new Response(request.method === 'HEAD' ? null : body, { headers: { 'content-type': asset.type, 'cache-control': path.endsWith('.html') || path === '/build-info.json' ? 'no-store' : 'public, max-age=3600', 'referrer-policy': 'no-referrer', 'x-content-type-options': 'nosniff' } })
  },
}
