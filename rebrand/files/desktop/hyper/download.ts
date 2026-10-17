import { createWriteStream } from "node:fs"
import { mkdir, rename, stat } from "node:fs/promises"
import path from "node:path"
import { once } from "node:events"

/**
 * Downloads `url` to `dest` through a `.part` file, resuming a previous
 * attempt, and only renames once the byte count matches the server's length.
 */
export async function download(url: string, dest: string, onProgress?: (done: number, total: number) => void) {
  await mkdir(path.dirname(dest), { recursive: true })
  const part = `${dest}.part`
  const have = await stat(part).then(
    (info) => info.size,
    () => 0,
  )
  const response = await fetch(url, { headers: have ? { Range: `bytes=${have}-` } : {} })
  if (!response.ok || !response.body) throw new Error(`Download failed (${response.status}): ${url}`)

  const resumed = response.status === 206
  const start = resumed ? have : 0
  const length = Number(response.headers.get("content-length") ?? 0)
  const total = length ? start + length : 0

  let done = start
  const out = createWriteStream(part, { flags: resumed ? "a" : "w" })
  for await (const chunk of response.body) {
    if (!out.write(chunk)) await once(out, "drain")
    onProgress?.((done += chunk.length), total)
  }
  out.end()
  await once(out, "finish")

  if (total && (await stat(part)).size !== total) throw new Error(`Incomplete download: ${url}`)
  await rename(part, dest)
}
