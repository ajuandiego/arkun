"""
KDP paperback wrap for Stolen Breath.

Trim 6 x 9 in, bleed 0.125 in, white paper, standard color ink.
Spine uses the KDP multiplier 0.002347 in per page.
Page count is the current trade PDF.

Back-cover copy replaces the auction blurb baked into the source JPEG.
No barcode is drawn. KDP places one in the clear zone at the lower right
of the back cover.
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "reader" / "public" / "assets"
OUT_PDF = ROOT / "11_kdp" / "Stolen_Breath_Cover_6x9.pdf"
OUT_PNG = ROOT / "11_kdp" / "Stolen_Breath_Cover_6x9.png"

DPI = 300
TRIM_W = 6.0
TRIM_H = 9.0
BLEED = 0.125
PAGES = 334
# Standard color ink on white paper.
SPINE_PER_PAGE = 0.002347
SPINE = PAGES * SPINE_PER_PAGE

WIDTH_IN = BLEED + TRIM_W + SPINE + TRIM_W + BLEED
HEIGHT_IN = BLEED + TRIM_H + BLEED

GOLD = (212, 175, 110)
CREAM = (243, 234, 216)
MUTED = (196, 176, 148)
PANEL = (16, 12, 24)
SPINE_COLOR = (14, 10, 20)

FONT_DIR = Path(r"C:\Windows\Fonts")
SERIF = FONT_DIR / "pala.ttf"
SERIF_BOLD = FONT_DIR / "palab.ttf"
BODY = FONT_DIR / "georgia.ttf"
BODY_ITALIC = FONT_DIR / "georgiai.ttf"
BODY_BOLD = FONT_DIR / "georgiab.ttf"


def px(inches: float) -> int:
    return int(round(inches * DPI))


def cover_fit(image: Image.Image, width: int, height: int, anchor: str) -> Image.Image:
    scale = max(width / image.width, height / image.height)
    resized = image.resize(
        (max(1, int(round(image.width * scale))), max(1, int(round(image.height * scale)))),
        Image.Resampling.LANCZOS,
    )
    if anchor == "top":
        left = max(0, (resized.width - width) // 2)
        top = 0
    else:
        left = max(0, (resized.width - width) // 2)
        top = max(0, (resized.height - height) // 2)
    return resized.crop((left, top, left + width, top + height))


def wrap(draw: ImageDraw.ImageDraw, text: str, font: ImageFont.FreeTypeFont, max_width: int) -> list[str]:
    lines: list[str] = []
    current = ""
    for word in text.split():
        trial = word if not current else f"{current} {word}"
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    return lines


def main() -> None:
    width = px(WIDTH_IN)
    height = px(HEIGHT_IN)
    canvas = Image.new("RGB", (width, height), SPINE_COLOR)
    draw = ImageDraw.Draw(canvas)

    back_w = px(BLEED + TRIM_W)
    front_x = px(BLEED + TRIM_W + SPINE)
    front_w = px(TRIM_W + BLEED)
    spine_x = px(BLEED + TRIM_W)
    spine_w = front_x - spine_x

    back_src = Image.open(ASSETS / "back_cover_kdp_highres.jpg").convert("RGB")
    front_src = Image.open(ASSETS / "cover_kdp_highres.jpg").convert("RGB")
    canvas.paste(cover_fit(back_src, back_w, height, "top"), (0, 0))
    canvas.paste(cover_fit(front_src, front_w, height, "center"), (front_x, 0))

    # Cover the auction blurb. The panel is sized to the new copy
    # after the lines are measured below.
    panel_left = px(0.55)
    panel_right = px(BLEED + TRIM_W - 0.42)
    panel_top = px(1.55)

    headline_font = ImageFont.truetype(str(SERIF_BOLD), px(0.16))
    body_font = ImageFont.truetype(str(BODY), px(0.105))
    italic_font = ImageFont.truetype(str(BODY_ITALIC), px(0.115))
    small_font = ImageFont.truetype(str(BODY), px(0.078))
    text_left = panel_left + px(0.28)
    text_right = panel_right - px(0.28)
    text_width = text_right - text_left
    y = panel_top + px(0.28)
    queued: list[tuple[str, ImageFont.FreeTypeFont, tuple[int, int, int], int]] = []

    def center_line(line: str, font: ImageFont.FreeTypeFont, fill: tuple[int, int, int]) -> None:
        nonlocal y
        queued.append((line, font, fill, y))
        y += int(font.size * 1.25)

    def paragraph(text: str, font: ImageFont.FreeTypeFont, fill: tuple[int, int, int], gap: float) -> None:
        nonlocal y
        for line in wrap(draw, text, font, text_width):
            queued.append((line, font, fill, y))
            y += int(font.size * 1.35)
        y += px(gap)

    center_line("SHE STOLE THE PROOF.", headline_font, GOLD)
    center_line("HE WAS SENT TO BRING BACK HER BODY.", headline_font, GOLD)
    y += px(0.16)
    paragraph(
        "In a world that sells the air, a rogue hacker takes the Lazarus Key and runs. The Consortium sends Commander Vram Tyage, a winged soldier burning from the inside out. One accidental touch silences the agony in his skull.",
        body_font,
        CREAM,
        0.12,
    )
    paragraph(
        "Now the hunter and the thief have to survive the legion, the cold, and each other.",
        body_font,
        CREAM,
        0.14,
    )
    center_line("Partners, or nothing.", italic_font, GOLD)
    y += px(0.16)
    center_line("Book One of The Arkun Cycle", small_font, MUTED)
    y += px(0.08)
    paragraph(
        "Adult. Explicit consensual sex, graphic violence, body horror, captivity, strong language.",
        small_font,
        MUTED,
        0.0,
    )
    panel_bottom = px(HEIGHT_IN - 1.85)
    content_h = y - queued[0][3]
    shift = panel_top + px(0.32) + max(0, (panel_bottom - panel_top - px(0.64) - content_h) // 2) - queued[0][3]
    draw.rectangle((panel_left, panel_top, panel_right, panel_bottom), fill=PANEL)
    rule_top = queued[0][3] + shift - px(0.14)
    rule_bottom = y + shift + px(0.02)
    draw.rectangle((text_left, rule_top, text_right, rule_top + px(0.012)), fill=GOLD)
    draw.rectangle((text_left, rule_bottom, text_right, rule_bottom + px(0.012)), fill=GOLD)
    for line, font, fill, top in queued:
        line_w = draw.textlength(line, font=font)
        draw.text((text_left + (text_width - line_w) / 2, top + shift), line, font=font, fill=fill)

    # Spine text reads top to bottom.
    spine_title = ImageFont.truetype(str(SERIF_BOLD), px(0.13))
    spine_small = ImageFont.truetype(str(SERIF), px(0.085))

    def spine_label(text: str, font: ImageFont.FreeTypeFont) -> Image.Image:
        temp = Image.new("RGBA", (px(8), px(0.7)), (0, 0, 0, 0))
        temp_draw = ImageDraw.Draw(temp)
        temp_draw.text((0, 0), text, font=font, fill=GOLD)
        bbox = temp.getbbox()
        if not bbox:
            return temp
        cropped = temp.crop(bbox)
        return cropped.rotate(90, expand=True, resample=Image.Resampling.BICUBIC)

    title_img = spine_label("STOLEN BREATH", spine_title)
    author_img = spine_label("J.D. ALFARO", spine_small)
    series_img = spine_label("THE ARKUN CYCLE", spine_small)

    def paste_spine(label: Image.Image, top: int) -> None:
        x = spine_x + (spine_w - label.width) // 2
        canvas.paste(label, (x, top), label)

    paste_spine(series_img, px(0.55))
    paste_spine(title_img, (height - title_img.height) // 2)
    paste_spine(author_img, height - author_img.height - px(0.55))

    OUT_PDF.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(OUT_PNG, "PNG", dpi=(DPI, DPI))
    canvas.save(OUT_PDF, "PDF", resolution=DPI)
    print(f"pages={PAGES} spine_in={SPINE:.4f} pdf={OUT_PDF}")
    print(f"inches={WIDTH_IN:.4f} x {HEIGHT_IN:.4f} px={width}x{height}")


if __name__ == "__main__":
    main()
