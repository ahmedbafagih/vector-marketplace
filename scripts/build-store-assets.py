from pathlib import Path
from PIL import Image, ImageDraw, ImageFilter
import shutil

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "StoreAssets"
REVIEW = Path.home() / "Downloads" / "Vector-Chrome-Store-Assets-Review"
OUT.mkdir(exist_ok=True)
REVIEW.mkdir(parents=True, exist_ok=True)

INK = (6, 15, 23)
PANEL = (11, 28, 39)
CYAN = (104, 224, 205)
PURPLE = (137, 105, 245)


def gradient(size, left=INK, right=(12, 35, 46)):
    image = Image.new("RGB", size)
    pixels = image.load()
    for x in range(size[0]):
        ratio = x / max(1, size[0] - 1)
        color = tuple(round(left[i] * (1 - ratio) + right[i] * ratio) for i in range(3))
        for y in range(size[1]):
            pixels[x, y] = color
    return image


def glow(base, center, radius, color, strength=150):
    layer = Image.new("RGBA", base.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(layer)
    draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=(*color, strength))
    layer = layer.filter(ImageFilter.GaussianBlur(radius / 2))
    base.paste(layer, (0, 0), layer)


def orbit_art(size, icon_scale=0.34):
    image = gradient(size)
    glow(image, (round(size[0] * 0.32), round(size[1] * 0.45)), round(size[1] * 0.42), CYAN, 100)
    glow(image, (round(size[0] * 0.72), round(size[1] * 0.52)), round(size[1] * 0.35), PURPLE, 70)
    draw = ImageDraw.Draw(image, "RGBA")
    center = (size[0] // 2, size[1] // 2)
    for factor, color, width in [(0.72, CYAN, 2), (0.50, PURPLE, 2), (0.32, (210, 250, 248), 1)]:
        rx = round(size[0] * factor / 2)
        ry = round(size[1] * factor / 2)
        draw.ellipse((center[0] - rx, center[1] - ry, center[0] + rx, center[1] + ry), outline=(*color, 85), width=width)
    icon = Image.open(ROOT / "Extension" / "icon-128.png").convert("RGBA")
    icon_size = max(64, round(min(size) * icon_scale))
    icon = icon.resize((icon_size, icon_size), Image.Resampling.LANCZOS)
    shadow = Image.new("RGBA", image.size, (0, 0, 0, 0))
    shadow.paste(icon, (center[0] - icon_size // 2, center[1] - icon_size // 2), icon)
    blurred = shadow.filter(ImageFilter.GaussianBlur(max(8, icon_size // 8)))
    image.paste(blurred, (0, 0), blurred)
    image.paste(icon, (center[0] - icon_size // 2, center[1] - icon_size // 2), icon)
    return image


def screenshot(source, destination):
    raw = Image.open(source).convert("RGB")
    canvas = gradient((1280, 800), (5, 13, 20), (12, 33, 43))
    glow(canvas, (1020, 90), 240, PURPLE, 45)
    glow(canvas, (170, 720), 260, CYAN, 40)
    max_w, max_h = 1160, 740
    scale = min(max_w / raw.width, max_h / raw.height)
    fitted = raw.resize((round(raw.width * scale), round(raw.height * scale)), Image.Resampling.LANCZOS)
    x = (canvas.width - fitted.width) // 2
    y = (canvas.height - fitted.height) // 2
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    mask = Image.new("L", fitted.size, 255)
    shadow.paste((0, 0, 0, 180), (x, y + 12, x + fitted.width, y + 12 + fitted.height), mask)
    shadow = shadow.filter(ImageFilter.GaussianBlur(20))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(fitted, (x, y))
    canvas.save(destination, optimize=True)


def popup_screenshot(source, destination):
    raw = Image.open(source).convert("RGB").crop((7, 4, 361, 469))
    canvas = orbit_art((1280, 800), 0.16)
    fitted = raw.resize((525, 690), Image.Resampling.LANCZOS)
    x = (canvas.width - fitted.width) // 2
    y = (canvas.height - fitted.height) // 2
    shadow = Image.new("RGBA", canvas.size, (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.rounded_rectangle((x - 12, y, x + fitted.width + 12, y + fitted.height + 24), radius=28, fill=(0, 0, 0, 180))
    shadow = shadow.filter(ImageFilter.GaussianBlur(24))
    canvas.paste(shadow, (0, 0), shadow)
    canvas.paste(fitted, (x, y))
    canvas.save(destination, optimize=True)


shutil.copy2(ROOT / "Extension" / "icon-128.png", OUT / "store-icon-128.png")
orbit_art((440, 280), 0.38).save(OUT / "small-promo-440x280.png", optimize=True)
orbit_art((1400, 560), 0.42).save(OUT / "marquee-1400x560.png", optimize=True)

shots = [
    ("onboarding-welcome-source.png", "screenshot-1-welcome-1280x800.png"),
    ("onboarding-distance-source.png", "screenshot-2-distance-1280x800.png"),
    ("onboarding-limits-source.png", "screenshot-3-limits-1280x800.png"),
    ("onboarding-connect-source.png", "screenshot-4-connect-1280x800.png"),
]
for source, destination in shots:
    screenshot(OUT / source, OUT / destination)
popup_screenshot(OUT / "companion-popup-source.png", OUT / "screenshot-5-disclosure-1280x800.png")

for name in ["store-icon-128.png", "small-promo-440x280.png", "marquee-1400x560.png", *(item[1] for item in shots), "screenshot-5-disclosure-1280x800.png"]:
    shutil.copy2(OUT / name, REVIEW / name)

previews = [Image.open(OUT / item[1]).convert("RGB").resize((480, 300), Image.Resampling.LANCZOS) for item in shots]
previews.append(Image.open(OUT / "screenshot-5-disclosure-1280x800.png").convert("RGB").resize((480, 300), Image.Resampling.LANCZOS))
sheet = Image.new("RGB", (980, 930), INK)
for index, preview in enumerate(previews):
    sheet.paste(preview, (10 + (index % 2) * 490, 10 + (index // 2) * 310))
sheet.save(REVIEW / "Vector-Store-Screenshots-Review.png", optimize=True)

print(OUT)
print(REVIEW)
