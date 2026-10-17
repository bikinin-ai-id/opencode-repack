import { chmod, cp, mkdir, mkdtemp, rm, stat } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { download } from "./download"
import { manifest } from "./manifest"
import { executable, lmStudioInstaller, modelUrl } from "./platform"
import { launch, run } from "./process"
import type { Report } from "./process"

const exists = (file: string) =>
  stat(file).then(
    () => true,
    () => false,
  )

export const lmsPath = () => path.join(os.homedir(), ".lmstudio", "bin", executable("lms"))

/** Where each platform's installer leaves the app, used to detect an existing install. */
function appLocation(dataDir: string) {
  if (process.platform === "win32")
    return path.join(
      process.env.LOCALAPPDATA ?? path.join(os.homedir(), "AppData", "Local"),
      "Programs",
      "LM Studio",
      "LM Studio.exe",
    )
  if (process.platform === "darwin") return path.join(os.homedir(), "Applications", "LM Studio.app")
  return path.join(dataDir, "lm-studio", "LM-Studio.AppImage")
}

export async function lmStudioInstalled(dataDir: string) {
  return (
    (await exists(lmsPath())) || (await exists(appLocation(dataDir))) || (await exists("/Applications/LM Studio.app"))
  )
}

/** Installs the official, unmodified LM Studio build for this platform. */
export async function installLmStudio(dataDir: string, report: Report) {
  const installer = lmStudioInstaller(process.platform, process.arch)
  if (!installer) throw new Error(`LM Studio does not publish a build for ${process.platform}/${process.arch}`)
  const downloads = path.join(dataDir, "downloads")
  const file = path.join(downloads, path.basename(new URL(installer.url).pathname))
  report("Downloading LM Studio", 0)
  await download(installer.url, file, (done, total) => total && report("Downloading LM Studio", done / total))

  report("Installing LM Studio", 1)
  if (installer.kind === "exe") await run(file, ["/S"])
  if (installer.kind === "dmg") await installDmg(file)
  if (installer.kind === "appimage") {
    const target = appLocation(dataDir)
    await mkdir(path.dirname(target), { recursive: true })
    await cp(file, target)
    await chmod(target, 0o755)
  }
  await rm(file, { force: true })
}

async function installDmg(dmg: string) {
  const mount = await mkdtemp(path.join(os.tmpdir(), "hyper-ai-lmstudio-"))
  await run("hdiutil", ["attach", dmg, "-nobrowse", "-readonly", "-mountpoint", mount])
  try {
    const applications = path.join(os.homedir(), "Applications")
    await mkdir(applications, { recursive: true })
    await cp(path.join(mount, "LM Studio.app"), path.join(applications, "LM Studio.app"), {
      recursive: true,
      force: true,
    })
  } finally {
    await run("hdiutil", ["detach", mount, "-force"]).catch(() => undefined)
    await rm(mount, { recursive: true, force: true })
  }
}

/** Downloads the pinned GGUF models into LM Studio's models directory. */
export async function installModels(report: Report) {
  for (const model of manifest.models) {
    const dest = path.join(os.homedir(), ".lmstudio", "models", model.publisher, model.repo, model.file)
    const present = await stat(dest).then(
      (info) => info.size === model.bytes,
      () => false,
    )
    if (present) continue
    report(`Downloading ${model.id}`, 0)
    await download(modelUrl(model), dest, (done, total) => total && report(`Downloading ${model.id}`, done / total))
  }
}

/** Starts LM Studio's headless server when its CLI exists (it appears after the app has run once). */
export async function startLmServer(logDir: string) {
  if (!(await exists(lmsPath()))) return false
  await run(lmsPath(), ["daemon", "up"]).catch(() => undefined)
  const child = await launch(
    lmsPath(),
    ["server", "start", "--port", String(manifest.lmstudio.port)],
    path.join(logDir, "lmstudio.log"),
  )
  child.unref()
  return true
}
