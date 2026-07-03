"""Generates VaultNUBAN favicon + OG image assets from the Balanced Ledger
palette (see src/styles.css :root tokens). Run with: python scripts/generate-brand-assets.py
Not part of the build — output is committed directly to public/.
"""
from PIL import Image, ImageDraw, ImageFont
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUBLIC = os.path.join(ROOT, "public")

INK = (28, 34, 48)       # approx oklch(0.22 0.03 260) — --primary
PAPER = (250, 250, 248)  # approx oklch(0.985 0.002 264) — --background
FG = (31, 35, 40)        # approx oklch(0.18 0.02 260) — --foreground
MUTED = (110, 118, 128)

FONT_DIR = "C:/Windows/Fonts"


def mark(size: int, padding_ratio: float = 0.16) -> Image.Image:
    """The brand mark: an ink rounded-square with a paper ring, matching the
    sidebar's `bg-primary` + lucide Circle icon treatment."""
    img = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    radius = round(size * 0.22)
    d.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=INK)
    pad = round(size * padding_ratio)
    stroke = max(2, round(size * 0.09))
    d.ellipse([pad, pad, size - pad, size - pad], outline=PAPER, width=stroke)
    return img


def save_favicons():
    sizes = [16, 32, 48, 180]
    imgs = {s: mark(s) for s in sizes}
    for s in (16, 32, 180):
        name = "apple-touch-icon.png" if s == 180 else f"favicon-{s}.png"
        imgs[s].save(os.path.join(PUBLIC, name))
    # .ico bundling the classic sizes
    imgs[16].save(
        os.path.join(PUBLIC, "favicon.ico"),
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[imgs[32], imgs[48]],
    )
    # Standalone SVG for modern browsers (crisp at any size)
    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <rect width="64" height="64" rx="14" fill="rgb{INK}" />
  <circle cx="32" cy="32" r="17" fill="none" stroke="rgb{PAPER}" stroke-width="6" />
</svg>"""
    with open(os.path.join(PUBLIC, "favicon.svg"), "w") as f:
        f.write(svg)


def og_image():
    W, H = 1200, 630
    img = Image.new("RGB", (W, H), PAPER)
    d = ImageDraw.Draw(img)

    # Thin ledger-rule border, institutional not decorative
    d.rectangle([0, 0, W - 1, H - 1], outline=(225, 227, 230), width=2)

    m = mark(96)
    img.paste(m, (100, 120), m)

    title_font = ImageFont.truetype(os.path.join(FONT_DIR, "arialbd.ttf"), 64)
    tagline_font = ImageFont.truetype(os.path.join(FONT_DIR, "arial.ttf"), 28)
    mono_font = ImageFont.truetype(os.path.join(FONT_DIR, "consola.ttf"), 22)

    d.text((100, 250), "VaultNUBAN", font=title_font, fill=FG)
    d.text((104, 330), "Ledger-first financial operating system", font=tagline_font, fill=MUTED)
    d.text((104, 500), "Sum(debits) = Sum(credits)", font=mono_font, fill=MUTED)

    img.save(os.path.join(PUBLIC, "og-image.png"))


if __name__ == "__main__":
    save_favicons()
    og_image()
    print("Generated favicon.ico, favicon.svg, favicon-16.png, favicon-32.png, apple-touch-icon.png, og-image.png")
