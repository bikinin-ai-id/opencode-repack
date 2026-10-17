import { chmod, cp, mkdir, readdir, rm, stat, writeFile } from "node:fs/promises"
import path from "node:path"
import { download } from "./download"
import { manifest } from "./manifest"
import { executable, uvAsset } from "./platform"
import { launch, listening, run } from "./process"
import type { Report } from "./process"

const hindsight = manifest.hindsight

export const hindsightRoot = (dataDir: string) => path.join(dataDir, "hindsight")
const venvBin = (root: string) => path.join(root, "venv", process.platform === "win32" ? "Scripts" : "bin")
const serverBinary = (root: string) => path.join(venvBin(root), executable("hindsight-api"))
const marker = (root: string) => path.join(root, `installed-${hindsight.version}`)

export const hindsightInstalled = (dataDir: string) =>
  stat(marker(hindsightRoot(dataDir))).then(
    () => true,
    () => false,
  )

/** Creates an isolated Python environment with the pinned hindsight-api; uv fetches its own Python. */
export async function installHindsight(dataDir: string, report: Report) {
  const root = hindsightRoot(dataDir)
  const asset = uvAsset(process.platform, process.arch)
  if (!asset) throw new Error(`uv is not available for ${process.platform}/${process.arch}`)
  await mkdir(root, { recursive: true })

  const uv = path.join(root, "uv", executable("uv"))
  if (!(await stat(uv).catch(() => undefined))) {
    report("Downloading uv", 0.02)
    const archive = path.join(root, asset.file)
    await download(asset.url, archive)
    const extract = path.join(root, "uv-extract")
    await rm(extract, { recursive: true, force: true })
    await mkdir(extract, { recursive: true })
    // bsdtar ships with Windows 10+, macOS and most Linux distributions and reads both formats.
    await run("tar", ["-xf", archive, "-C", extract])
    const found = await findFile(extract, executable("uv"))
    if (!found) throw new Error("uv binary not found in archive")
    await mkdir(path.dirname(uv), { recursive: true })
    await cp(found, uv)
    await chmod(uv, 0o755)
    await rm(extract, { recursive: true, force: true })
    await rm(archive, { force: true })
  }

  report("Creating Python environment", 0.15)
  await run(uv, ["venv", "--python", hindsight.python, path.join(root, "venv")])
  report("Installing Hindsight (this takes a few minutes)", 0.3)
  const python = path.join(venvBin(root), executable("python"))
  // CPU wheels keep the environment a few GB smaller; the memory server only embeds text.
  await run(uv, ["pip", "install", "--python", python, "--torch-backend", "cpu", `${hindsight.package}==${hindsight.version}`])
  await writeFile(marker(root), new Date().toISOString())
}

/** Starts the local memory server unless one already answers on its port. */
export async function startHindsight(dataDir: string, logDir: string) {
  if (await listening(hindsight.port, hindsight.host)) return undefined
  const root = hindsightRoot(dataDir)
  // Reasoning mode makes each extraction call take minutes and trips client timeouts, so it is switched off.
  return launch(
    serverBinary(root),
    ["--host", hindsight.host, "--port", String(hindsight.port)],
    path.join(logDir, "hindsight.log"),
    {
      PYTHONUTF8: "1",
      HINDSIGHT_API_LLM_PROVIDER: hindsight.llm.provider,
      HINDSIGHT_API_LLM_BASE_URL: hindsight.llm.baseUrl,
      HINDSIGHT_API_LLM_MODEL: hindsight.llm.model,
      HINDSIGHT_API_LLM_STRICT_SCHEMA: "true",
      HINDSIGHT_API_LLM_TIMEOUT: "300",
      HINDSIGHT_API_LLM_TEMPERATURE: "none",
      HINDSIGHT_API_LLM_REASONING_EFFORT: "none",
      HINDSIGHT_API_LLM_EXTRA_BODY: JSON.stringify({
        reasoning_effort: "none",
        chat_template_kwargs: { enable_thinking: false },
      }),
    },
  )
}

async function findFile(dir: string, name: string): Promise<string | undefined> {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isFile() && entry.name === name) return full
    if (entry.isDirectory()) {
      const nested = await findFile(full, name)
      if (nested) return nested
    }
  }
  return undefined
}
