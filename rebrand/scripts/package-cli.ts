// Archives the CLI builds from packages/cli/dist as standalone release assets.
//
// usage: bun rebrand/scripts/package-cli.ts <cli-dist-dir> <out-dir>
//
// Upstream names the executable `opencode` inside every target directory; the
// repack ships it as `hyper-ai` (`hyper-ai.exe` on Windows).

import { cp, mkdir, readdir, rm } from "node:fs/promises"
import path from "node:path"
import { $ } from "bun"
import { brand } from "../brand"

const [dist, out] = process.argv.slice(2).map((arg) => path.resolve(arg))
if (!dist || !out) {
  console.error("usage: bun package-cli.ts <cli-dist-dir> <out-dir>")
  process.exit(2)
}

await mkdir(out, { recursive: true })

const targets = (await readdir(dist, { withFileTypes: true })).filter(
  (entry) => entry.isDirectory() && entry.name.startsWith("cli-"),
)
if (!targets.length) throw new Error(`No cli-* directories in ${dist}`)

for (const target of targets) {
  const windows = target.name.startsWith("cli-windows")
  const name = `${brand.cli}-${target.name.slice("cli-".length)}`
  const stage = path.join(out, ".stage", name)
  await rm(stage, { recursive: true, force: true })
  await mkdir(stage, { recursive: true })
  await cp(
    path.join(dist, target.name, "bin", windows ? "opencode.exe" : "opencode"),
    path.join(stage, windows ? `${brand.cli}.exe` : brand.cli),
  )
  if (windows) await $`cd ${path.dirname(stage)} && zip -qr ${path.join(out, `${name}.zip`)} ${name}`
  else await $`tar -czf ${path.join(out, `${name}.tar.gz`)} -C ${path.dirname(stage)} ${name}`
  console.log(`packaged ${name}`)
}
await rm(path.join(out, ".stage"), { recursive: true, force: true })
