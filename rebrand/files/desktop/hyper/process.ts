import { spawn } from "node:child_process"
import { createWriteStream } from "node:fs"
import { mkdir } from "node:fs/promises"
import net from "node:net"
import path from "node:path"

/** Progress callback: a message and, when known, completion between 0 and 1. */
export type Report = (message: string, fraction?: number) => void

/** Runs a command to completion; the tail of its output is the error message on failure. */
export function run(command: string, args: string[], options: { cwd?: string; env?: NodeJS.ProcessEnv } = {}) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn(command, args, { ...options, env: { ...process.env, ...options.env }, windowsHide: true })
    let output = ""
    const collect = (chunk: Buffer) => (output = (output + chunk.toString()).slice(-4000))
    child.stdout.on("data", collect)
    child.stderr.on("data", collect)
    child.on("error", reject)
    child.on("close", (code) =>
      code === 0 ? resolve(output) : reject(new Error(`${path.basename(command)} exited ${code}: ${output.trim()}`)),
    )
  })
}

/** Starts a long-running child with its output appended to a log file. */
export async function launch(command: string, args: string[], logFile: string, env: NodeJS.ProcessEnv = {}) {
  await mkdir(path.dirname(logFile), { recursive: true })
  const log = createWriteStream(logFile, { flags: "a" })
  const child = spawn(command, args, {
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  })
  child.stdout.pipe(log)
  child.stderr.pipe(log)
  return child
}

export function listening(port: number, host = "127.0.0.1") {
  return new Promise<boolean>((resolve) => {
    const socket = net.connect({ port, host })
    socket.once("connect", () => (socket.destroy(), resolve(true)))
    socket.once("error", () => resolve(false))
  })
}
