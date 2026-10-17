import { manifest } from "./manifest"

type Platform = NodeJS.Platform
type Arch = string

const uvTriples: Record<string, string> = {
  "win32-x64": "x86_64-pc-windows-msvc",
  "win32-arm64": "aarch64-pc-windows-msvc",
  "darwin-x64": "x86_64-apple-darwin",
  "darwin-arm64": "aarch64-apple-darwin",
  "linux-x64": "x86_64-unknown-linux-gnu",
  "linux-arm64": "aarch64-unknown-linux-gnu",
}

/** Official uv release asset for this machine, or undefined when uv does not ship one. */
export function uvAsset(platform: Platform, arch: Arch) {
  const triple = uvTriples[`${platform}-${arch}`]
  if (!triple) return undefined
  const file = `uv-${triple}.${platform === "win32" ? "zip" : "tar.gz"}`
  return { file, url: `https://github.com/astral-sh/uv/releases/download/${manifest.uv.version}/${file}` }
}

/** LM Studio publishes no Intel macOS build. */
export function lmStudioInstaller(platform: Platform, arch: Arch) {
  const version = manifest.lmstudio.version
  const base = `https://installers.lmstudio.ai`
  if (platform === "win32" && (arch === "x64" || arch === "arm64"))
    return { kind: "exe" as const, url: `${base}/win32/${arch}/${version}/LM-Studio-${version}-${arch}.exe` }
  if (platform === "darwin" && arch === "arm64")
    return { kind: "dmg" as const, url: `${base}/darwin/arm64/${version}/LM-Studio-${version}-arm64.dmg` }
  if (platform === "linux" && (arch === "x64" || arch === "arm64"))
    return { kind: "appimage" as const, url: `${base}/linux/${arch}/${version}/LM-Studio-${version}-${arch}.AppImage` }
  return undefined
}

export function modelUrl(model: (typeof manifest.models)[number]) {
  return `https://huggingface.co/${model.publisher}/${model.repo}/resolve/main/${model.file}`
}

export function executable(name: string, platform: Platform = process.platform) {
  return platform === "win32" ? `${name}.exe` : name
}
