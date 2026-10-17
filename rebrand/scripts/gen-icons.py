"""Generate the desktop icon set from assets/hyperos-mark-soft-navy.png.

usage: python3 rebrand/scripts/gen-icons.py

Output goes to rebrand/assets/icons and uses the same file names as
packages/desktop/icons/<channel>, so apply.ts can copy it over upstream's set.
macOS icons carry the usual inset (artwork ~80% of the canvas) because Electron
does not add one for .icns files.
"""
from pathlib import Path
from PIL import Image, ImageDraw

here = Path(__file__).resolve().parent.parent
mark = Image.open(here / "assets" / "hyperos-mark-soft-navy.png").convert("RGBA")
out = here / "assets" / "icons"
out.mkdir(parents=True, exist_ok=True)

BACKGROUND = (255, 255, 255, 255)


def tile(size: int, inset: float = 0.0, radius: float = 0.225) -> Image.Image:
    """White rounded square with the mark centred on it."""
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    pad = round(size * inset)
    body = size - 2 * pad
    mask = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        (pad * 4, pad * 4, (pad + body) * 4 - 1, (pad + body) * 4 - 1), radius=body * 4 * radius, fill=255
    )
    mask = mask.resize((size, size), Image.LANCZOS)
    canvas.paste(Image.new("RGBA", (size, size), BACKGROUND), (0, 0), mask)
    art = body * 0.62
    scale = art / max(mark.size)
    glyph = mark.resize((round(mark.width * scale), round(mark.height * scale)), Image.LANCZOS)
    canvas.alpha_composite(glyph, ((size - glyph.width) // 2, (size - glyph.height) // 2 + round(size * 0.015)))
    return canvas


# Plain tile for Windows / Linux, inset tile for macOS.
flat = {f"{n}x{n}.png": n for n in (32, 64, 128)}
for name, size in flat.items():
    tile(size).save(out / name)
tile(256).save(out / "128x128@2x.png")
tile(512).save(out / "icon.png")
for size in (30, 44, 71, 89, 107, 142, 150, 284, 310):
    tile(size).save(out / f"Square{size}x{size}Logo.png")
tile(50).save(out / "StoreLogo.png")
tile(256, inset=0.1).save(out / "dock.png")

big = tile(1024)
big.save(out / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
tile(1024, inset=0.1).save(out / "icon.icns")
print("wrote", len(list(out.iterdir())), "files to", out)
