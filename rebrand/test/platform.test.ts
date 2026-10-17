import { expect, test } from "bun:test"
import { lmStudioInstaller, modelUrl, uvAsset } from "../files/desktop/hyper/platform"
import { manifest } from "../files/desktop/hyper/manifest"

test("uv assets cover every desktop target", () => {
  const targets: Array<[NodeJS.Platform, string, string]> = [
    ["win32", "x64", "uv-x86_64-pc-windows-msvc.zip"],
    ["win32", "arm64", "uv-aarch64-pc-windows-msvc.zip"],
    ["darwin", "x64", "uv-x86_64-apple-darwin.tar.gz"],
    ["darwin", "arm64", "uv-aarch64-apple-darwin.tar.gz"],
    ["linux", "x64", "uv-x86_64-unknown-linux-gnu.tar.gz"],
    ["linux", "arm64", "uv-aarch64-unknown-linux-gnu.tar.gz"],
  ]
  for (const [platform, arch, file] of targets) expect(uvAsset(platform, arch)?.file).toBe(file)
  expect(uvAsset("freebsd", "x64")).toBeUndefined()
})

test("LM Studio has no Intel macOS build", () => {
  expect(lmStudioInstaller("darwin", "x64")).toBeUndefined()
  expect(lmStudioInstaller("darwin", "arm64")?.kind).toBe("dmg")
  expect(lmStudioInstaller("win32", "x64")?.kind).toBe("exe")
  expect(lmStudioInstaller("linux", "arm64")?.kind).toBe("appimage")
})

// The pinned download locations must exist at their publishers.
test.skipIf(!process.env.HYPER_E2E_NETWORK)("pinned URLs resolve", async () => {
  const urls = [
    uvAsset("linux", "x64")!.url,
    lmStudioInstaller("win32", "x64")!.url,
    lmStudioInstaller("darwin", "arm64")!.url,
    lmStudioInstaller("linux", "x64")!.url,
    modelUrl(manifest.models[0]),
  ]
  for (const url of urls) {
    const response = await fetch(url, { method: "HEAD" })
    expect(response.ok, url).toBe(true)
  }
  const model = await fetch(modelUrl(manifest.models[0]), { method: "HEAD" })
  expect(Number(model.headers.get("content-length"))).toBe(manifest.models[0].bytes)
}, 60_000)
