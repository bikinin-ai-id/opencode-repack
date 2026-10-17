import { expect, test } from "bun:test"
import { createAppFixture } from "./fixture/app"
import { tmpdir } from "./fixture/fixture"

// The startup wordmark on the home screen. Upstream renders "OPEN" + "CODE";
// the Hyper AI repack renders "HYPER" + "AI" with a two-column gap between the
// words. Pin the exact painted rows so a glyph or spacing regression fails.
const HYPER = "█  █ █  █ █▀▀█ █▀▀▀ █▀▀█"
const MIDDLE = "█▀▀█ ▀██▀ █▀▀▀ █▀▀▀ █▀▀█"
const BASELINE = "▀  ▀  ▀▀  ▀    ▀▀▀▀ ▀  ▀"
const AI = "▄▀▀▄ ▀██▀"

test("home screen wordmark reads HYPER AI", async () => {
  await using state = await tmpdir()
  await using setup = await createAppFixture({ width: 100, height: 30, state: state.path })
  await setup.ready
  await setup.waitForFrame((frame) => frame.includes("█"))
  await setup.renderOnce()

  const frame = setup.captureCharFrame()

  expect(frame).toContain(`${HYPER}  ${AI}`)
  expect(frame).toContain(`${MIDDLE}  █▀▀█`)
  expect(frame).toContain(`${BASELINE}  ▀  ▀`)
})
