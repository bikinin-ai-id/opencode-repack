// Pinned components provisioned for Hyper AI. Everything here is downloaded
// from its publisher on the user's machine; nothing third-party is
// redistributed inside the installer except open source npm packages
// (Context7), which rebrand/scripts/prepare-bundle.ts vendors at
// build time.
export const manifest = {
  context7: {
    package: "@upstash/context7-mcp",
    version: "4.4.2",
    // Relative to the bundle root (resources/hyper-bundle).
    entry: "context7/node_modules/@upstash/context7-mcp/dist/index.js",
  },
  uv: { version: "0.9.0" },
  hindsight: {
    package: "hindsight-api",
    version: "1.0.0",
    python: "3.12",
    host: "127.0.0.1",
    port: 8888,
    llm: { provider: "lmstudio", baseUrl: "http://localhost:1234/v1", model: "qwen3.5-9b" },
  },
  lmstudio: { version: "0.4.25-1", port: 1234 },
  models: [
    {
      id: "qwen3.5-9b",
      publisher: "unsloth",
      repo: "Qwen3.5-9B-GGUF",
      file: "Qwen3.5-9B-Q4_K_M.gguf",
      bytes: 5680522464,
    },
  ],
}
