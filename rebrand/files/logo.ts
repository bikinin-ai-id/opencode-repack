// Block wordmark used on the home screen and in the session epilogue.
//
// Each glyph is 4 columns wide and 4 rows tall. Row 0 is an unused accent row,
// matching the upstream layout so the narrow mode's `logo.left.slice(1)` still
// drops a blank line.
//
// Marks understood by the renderer: `_` dim cell, `^` bright top / dim bottom,
// `~` dim top, `,` dim bottom, anything else is drawn literally with the
// foreground colour (`█` full, `▀` top half, `▄` bottom half).
//
// left renders in the muted colour, right in the default foreground; the
// component puts a 2-column gap between them so "HYPER" and "AI" read as
// separate words.

const H = ["    ", "█  █", "█▀▀█", "▀  ▀"]
const Y = ["    ", "█  █", "▀██▀", " ▀▀ "]
const P = ["    ", "█^^█", "█▀▀▀", "▀   "]
const E = ["    ", "█▀▀▀", "█▀▀▀", "▀▀▀▀"]
const R = ["    ", "█^^█", "█▀▀█", "▀  ▀"]
const A = ["    ", "▄▀▀▄", "█▀▀█", "▀  ▀"]
const I = ["    ", "▀██▀", " ██ ", "▀▀▀▀"]

// Glyphs are separated by a single column of tracking. The pad is a guard so a
// mistyped glyph still lines up.
function rows(glyphs: string[][]): string[] {
  const width = glyphs.length * 4 + (glyphs.length - 1)
  return [0, 1, 2, 3].map((index) =>
    glyphs
      .map((glyph) => glyph[index])
      .join(" ")
      .padEnd(width, " "),
  )
}

export const logo = {
  left: rows([H, Y, P, E, R]),
  right: rows([A, I]),
}

export const go = {
  left: ["    ", "█▀▀▀", "█_^█", "▀▀▀▀"],
  right: ["    ", "█▀▀█", "█__█", "▀▀▀▀"],
}
