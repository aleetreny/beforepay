import { build } from 'esbuild'
import { readFileSync, readdirSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { extname } from 'node:path'

await import('./build.mjs')
const types = { '.html': 'text/html; charset=utf-8', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.js': 'text/javascript', '.txt': 'text/plain' }
const assets = {}
function collect(dir, prefix = '') {
  for (const item of readdirSync(dir, { withFileTypes: true })) {
    if (['assets', '.openai', 'server'].includes(item.name)) continue
    const path = `${dir}/${item.name}`
    if (item.isDirectory()) collect(path, `${prefix}/${item.name}`)
    else assets[`${prefix}/${item.name}`] = { type: types[extname(item.name)] ?? 'application/octet-stream', body: readFileSync(path).toString('base64') }
  }
}
collect('dist')
mkdirSync('dist/server', { recursive: true })
await build({ entryPoints: ['worker/index.ts'], outfile: 'dist/server/index.js', bundle: true, format: 'esm', platform: 'browser', target: 'es2022', minify: true, define: { STATIC_ASSETS: JSON.stringify(assets) } })
const manifest = JSON.parse(readFileSync('.openai/hosting.json', 'utf8'))
delete manifest.static
mkdirSync('dist/.openai', { recursive: true })
writeFileSync('dist/.openai/hosting.json', JSON.stringify(manifest, null, 2) + '\n')
for (const name of readdirSync('dist')) if (!['server', '.openai'].includes(name)) rmSync(`dist/${name}`, { recursive: true, force: true })
console.log('Built Sites Worker with embedded frontend and optional server integrations.')
