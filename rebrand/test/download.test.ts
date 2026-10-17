import { expect, test } from "bun:test"
import { mkdtemp, readFile, stat, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { download } from "../files/desktop/hyper/download"

const payload = Buffer.from(Array.from({ length: 300_000 }, (_, index) => index % 251))

function serve() {
  return Bun.serve({
    port: 0,
    fetch(request) {
      const range = request.headers.get("range")?.match(/bytes=(\d+)-/)
      if (!range) return new Response(payload)
      return new Response(payload.subarray(Number(range[1])), { status: 206 })
    },
  })
}

test("downloads a file and reports progress", async () => {
  using server = serve()
  const dest = path.join(await mkdtemp(path.join(os.tmpdir(), "hyper-dl-")), "file.bin")
  const seen: number[] = []
  await download(`http://localhost:${server.port}/`, dest, (done) => seen.push(done))
  expect(Buffer.compare(await readFile(dest), payload)).toBe(0)
  expect(seen.at(-1)).toBe(payload.length)
  expect(await stat(`${dest}.part`).catch(() => undefined)).toBeUndefined()
})

test("resumes from a partial file instead of starting over", async () => {
  using server = serve()
  const dest = path.join(await mkdtemp(path.join(os.tmpdir(), "hyper-dl-")), "file.bin")
  await writeFile(`${dest}.part`, payload.subarray(0, 100_000))
  await download(`http://localhost:${server.port}/`, dest)
  expect(Buffer.compare(await readFile(dest), payload)).toBe(0)
})
