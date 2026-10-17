import { expect, test } from "bun:test"
import { mkdtemp, readFile, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { applyServers, managed } from "../files/desktop/hyper/config"

const dir = () => mkdtemp(path.join(os.tmpdir(), "hyper-config-"))
const read = async (directory: string) => JSON.parse(await readFile(path.join(directory, "opencode.json"), "utf8"))
const context7 = (entry: string) => managed({ type: "local", command: ["electron", entry] })

test("creates the config file when none exists", async () => {
  const directory = await dir()
  expect(await applyServers(directory, { context7: context7("/a") })).toBe("updated")
  expect((await read(directory)).mcp.servers.context7.command).toEqual(["electron", "/a"])
})

test("keeps unrelated settings and the user's own servers", async () => {
  const directory = await dir()
  const own = { type: "remote", url: "https://example.test/mcp" }
  await writeFile(
    path.join(directory, "opencode.json"),
    JSON.stringify({ theme: "x", mcp: { servers: { context7: own, other: own } } }),
  )
  expect(await applyServers(directory, { context7: context7("/a") })).toBe("unchanged")
  const config = await read(directory)
  expect(config.theme).toBe("x")
  expect(config.mcp.servers.context7).toEqual(own)
})

test("refreshes an entry it wrote earlier when the install moves", async () => {
  const directory = await dir()
  await applyServers(directory, { context7: context7("/old") })
  expect(await applyServers(directory, { context7: context7("/new") })).toBe("updated")
  expect((await read(directory)).mcp.servers.context7.command[1]).toBe("/new")
  expect(await applyServers(directory, { context7: context7("/new") })).toBe("unchanged")
})

test("leaves a file that is not strict JSON untouched", async () => {
  const directory = await dir()
  const text = '{\n  // my notes\n  "theme": "x"\n}\n'
  await writeFile(path.join(directory, "opencode.json"), text)
  expect(await applyServers(directory, { context7: context7("/a") })).toBe("skipped")
  expect(await readFile(path.join(directory, "opencode.json"), "utf8")).toBe(text)
})
