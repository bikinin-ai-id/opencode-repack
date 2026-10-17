import { stat } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { hindsightInstalled, installHindsight } from "./hindsight"
import { installLmStudio, installModels, lmStudioInstalled } from "./lmstudio"
import { manifest } from "./manifest"
import type { Report } from "./process"

export type Component = {
  id: string
  name: string
  description: string
  /** approximate download size, shown in the wizard */
  bytes: number
  /** shipped inside the installer; always on */
  required?: boolean
  recommended?: boolean
  installed: (dataDir: string) => Promise<boolean>
  install: (dataDir: string, report: Report) => Promise<void>
}

const model = manifest.models[0]

export const components: Component[] = [
  {
    id: "context7",
    name: "Context7",
    description: "Dokumentasi library terbaru untuk agen. Sudah termasuk di installer.",
    bytes: 0,
    required: true,
    installed: async () => true,
    install: async () => undefined,
  },
  {
    id: "lmstudio",
    name: "LM Studio",
    description: "Menjalankan model AI di komputer Anda (build resmi dari penerbit, tidak dimodifikasi).",
    bytes: 0.7e9,
    recommended: true,
    installed: lmStudioInstalled,
    install: async (dataDir, report) => installLmStudio(dataDir, report),
  },
  {
    id: "models",
    name: "Model lokal Qwen3.5 9B",
    description: "Model untuk ekstraksi memori dan tugas offline.",
    bytes: model.bytes,
    recommended: true,
    installed: () =>
      stat(path.join(os.homedir(), ".lmstudio", "models", model.publisher, model.repo, model.file)).then(
        (info) => info.size === model.bytes,
        () => false,
      ),
    install: async (_dataDir, report) => installModels(report),
  },
  {
    id: "hindsight",
    name: "Memori Hindsight",
    description: "Memori jangka panjang antar-sesi, berjalan lokal di 127.0.0.1:8888 dan terdaftar sebagai MCP `mem`.",
    bytes: 2e9,
    recommended: true,
    installed: hindsightInstalled,
    install: async (dataDir, report) => installHindsight(dataDir, report),
  },
]

export type Update =
  | { type: "step"; id: string; status: "running" | "done" | "failed" | "skipped"; message?: string; fraction?: number }
  | { type: "complete"; failed: string[] }

/** Installs the chosen components in order; a failing one is reported and does not stop the rest. */
export async function provision(ids: string[], dataDir: string, emit: (update: Update) => void) {
  const failed: string[] = []
  for (const component of components.filter((item) => ids.includes(item.id) && !item.required)) {
    if (await component.installed(dataDir)) {
      emit({ type: "step", id: component.id, status: "skipped", message: "Sudah terpasang", fraction: 1 })
      continue
    }
    emit({ type: "step", id: component.id, status: "running", fraction: 0 })
    try {
      await component.install(dataDir, (message, fraction) =>
        emit({ type: "step", id: component.id, status: "running", message, fraction }),
      )
      emit({ type: "step", id: component.id, status: "done", fraction: 1 })
    } catch (error) {
      failed.push(component.id)
      emit({
        type: "step",
        id: component.id,
        status: "failed",
        message: error instanceof Error ? error.message : String(error),
      })
    }
  }
  emit({ type: "complete", failed })
  return failed
}
