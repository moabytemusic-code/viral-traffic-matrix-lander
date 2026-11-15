#!/usr/bin/env python3
"""
Builds the playable 7-section 180-second local rough-cut webinar video
(/public/videos/yusleep-full-rough-cut.mp4) and synchronized WebVTT captions
(/public/videos/yusleep-webinar-captions.vtt) at $0 external API cost.

- Section 1 (0:00 - 0:30, 30s): Reuses existing public/videos/yusleep-presenter-prototype.mp4
  (animated Sarah AI presenter + vidIQ/ElevenLabs voiceover).
- Sections 2-7 (0:30 - 3:00, 150s): Renders 1280x720 visual composites combining
  Sarah presenter PIP (public/images/yusleep-presenter.jpg), product bottle close-up
  (public/images/yusleep-bottle.png), zoomed Supplement Facts label artwork
  (public/images/yusleep-supplement-facts.jpg), readable slide bullets, and local
  macOS scratch narration (/usr/bin/say) clearly badged as a $0 rough cut awaiting
  approval for paid TTS/avatar generation.
"""

import json
import os
import subprocess
import tempfile
import textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
PLAN_PATH = os.path.join(ROOT, "yusleep-full-production-plan.json")
PRESENTER_IMG = os.path.join(ROOT, "public", "images", "yusleep-presenter.jpg")
BOTTLE_IMG = os.path.join(ROOT, "public", "images", "yusleep-bottle.png")
LABEL_IMG = os.path.join(ROOT, "public", "images", "yusleep-supplement-facts.jpg")
PROTOTYPE_MP4 = os.path.join(ROOT, "public", "videos", "yusleep-presenter-prototype.mp4")
OUT_MP4 = os.path.join(ROOT, "public", "videos", "yusleep-full-rough-cut.mp4")
OUT_VTT = os.path.join(ROOT, "public", "videos", "yusleep-webinar-captions.vtt")


def load_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf",
    ]
    for path in candidates:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except Exception:
                pass
    return ImageFont.load_default()


def format_vtt_time(seconds):
    total_ms = int(round(seconds * 1000))
    hrs = total_ms // 3600000
    rem = total_ms % 3600000
    mins = rem // 60000
    rem = rem % 60000
    secs = rem // 1000
    ms = rem % 1000
    return f"{hrs:02d}:{mins:02d}:{secs:02d}.{ms:03d}"


def draw_rounded_rect(draw, xy, radius, fill=None, outline=None, width=1):
    draw.rounded_rectangle(xy, radius=radius, fill=fill, outline=outline, width=width)


def render_section_slide(sec, out_png_path):
    width, height = 1280, 720
    img = Image.new("RGB", (width, height), (9, 14, 28))
    draw = ImageDraw.Draw(img)

    # Subtle background gradient bands
    for y in range(height):
        r = int(9 + (y / height) * 10)
        g = int(14 + (y / height) * 14)
        b = int(28 + (y / height) * 26)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    font_badge = load_font(15, bold=True)
    font_small = load_font(15, bold=False)
    font_title = load_font(30, bold=True)
    font_sub = load_font(18, bold=False)
    font_card_h = load_font(19, bold=True)
    font_card_b = load_font(17, bold=False)

    # Top Header Bar
    draw_rounded_rect(draw, (28, 20, 1252, 74), radius=14, fill=(18, 26, 48), outline=(56, 74, 122), width=1)
    draw.text((46, 36), "PRERECORDED AFFILIATE OVERVIEW  |  AI PRESENTER: SARAH", fill=(165, 180, 252), font=font_badge)

    # Rough Cut Status Badge (Right side of top bar)
    draw_rounded_rect(draw, (640, 28, 1238, 66), radius=10, fill=(68, 44, 16), outline=(217, 119, 6), width=1)
    draw.text(
        (656, 39),
        f"ROUGH CUT SECTION {sec['sectionNumber']}/7: Local Scratch Voice & Slide ($0 Cost)",
        fill=(253, 230, 138),
        font=font_badge,
    )

    # Left Main Content Panel (x: 28..835, y: 92..630)
    draw_rounded_rect(draw, (28, 92, 835, 630), radius=20, fill=(15, 23, 42), outline=(45, 58, 92), width=2)

    # Section Tag + Title
    sec_num = sec["sectionNumber"]
    start_mm = f"{sec['startTimeSec']//60}:{sec['startTimeSec']%60:02d}"
    end_mm = f"{sec['endTimeSec']//60}:{sec['endTimeSec']%60:02d}"
    draw_rounded_rect(draw, (52, 114, 430, 146), radius=8, fill=(30, 41, 75), outline=(79, 70, 229), width=1)
    draw.text((64, 122), f"SECTION {sec_num} OF 7  ({start_mm} - {end_mm})", fill=(199, 210, 254), font=font_badge)

    title_lines = textwrap.wrap(sec["title"], width=42)
    y_cursor = 160
    for line in title_lines:
        draw.text((52, y_cursor), line, fill=(248, 250, 252), font=font_title)
        y_cursor += 38

    purpose_lines = textwrap.wrap("Purpose: " + sec["purpose"], width=70)
    y_cursor += 4
    for line in purpose_lines[:2]:
        draw.text((52, y_cursor), line, fill=(148, 163, 184), font=font_sub)
        y_cursor += 24

    y_cursor += 12
    # Key On-Screen Bullet Cards
    for idx, bullet in enumerate(sec.get("onScreenText", [])[1:]):
        box_top = y_cursor
        wrapped = textwrap.wrap(bullet, width=62)
        box_h = max(54, 24 + len(wrapped) * 24)
        draw_rounded_rect(
            draw,
            (52, box_top, 810, box_top + box_h),
            radius=12,
            fill=(23, 33, 58),
            outline=(67, 83, 128),
            width=1,
        )
        draw.ellipse((68, box_top + 17, 92, box_top + 41), fill=(79, 70, 229))
        draw.text((76, box_top + 20), str(idx + 1), fill=(255, 255, 255), font=font_badge)
        ty = box_top + 15
        for wline in wrapped:
            draw.text((106, ty), wline, fill=(226, 232, 240), font=font_card_b)
            ty += 23
        y_cursor = box_top + box_h + 12

    # Spoken Script Excerpt Box at bottom of Left Panel
    if y_cursor < 545:
        excerpt_top = max(y_cursor + 4, 495)
        draw_rounded_rect(draw, (52, excerpt_top, 810, 612), radius=12, fill=(12, 19, 36), outline=(51, 65, 85), width=1)
        draw.text((68, excerpt_top + 10), "SARAH NARRATION TRANSCRIPT (VERIFIED SCRIPT):", fill=(129, 140, 248), font=font_badge)
        script_wrapped = textwrap.wrap('"' + sec["spokenScript"] + '"', width=76)
        sy = excerpt_top + 32
        for sline in script_wrapped[:3]:
            draw.text((68, sy), sline, fill=(203, 213, 225), font=font_small)
            sy += 21

    # Right Column: Sarah Presenter PIP (top) + Visual Evidence / Label / Bottle (bottom)
    # 1. Sarah Presenter PIP Card (x: 855..1252, y: 92..340)
    draw_rounded_rect(draw, (855, 92, 1252, 340), radius=18, fill=(15, 23, 42), outline=(99, 102, 241), width=2)
    if os.path.exists(PRESENTER_IMG):
        p_img = Image.open(PRESENTER_IMG).convert("RGB")
        p_crop = ImageOps.fit(p_img, (373, 195), method=Image.Resampling.LANCZOS)
        img.paste(p_crop, (867, 104))
    draw.text((867, 307), "Presenter: Sarah (AI Affiliate Host)", fill=(224, 231, 255), font=font_badge)

    # 2. Visual Asset Card (x: 855..1252, y: 356..630)
    draw_rounded_rect(draw, (855, 356, 1252, 630), radius=18, fill=(15, 23, 42), outline=(56, 74, 122), width=2)

    if sec_num == 3 and os.path.exists(LABEL_IMG):
        # Zoom into the Supplement Facts label artwork
        l_img = Image.open(LABEL_IMG).convert("RGB")
        # Crop left portion where Supplement Facts panel is printed
        lw, lh = l_img.size
        crop_box = (0, 0, int(lw * 0.52), lh)
        l_sub = l_img.crop(crop_box)
        l_fit = ImageOps.contain(l_sub, (370, 215), method=Image.Resampling.LANCZOS)
        paste_x = 855 + (397 - l_fit.width) // 2
        img.paste(l_fit, (paste_x, 368))
        draw.text((872, 595), "Supplied Supplement Facts Artwork Zoom", fill=(167, 243, 208), font=font_badge)
    elif sec_num == 5:
        # Merchant Offer Verification Card
        draw.text((875, 374), "VERIFIED CHECKOUT (2026-11-15)", fill=(110, 231, 183), font=font_card_h)
        rows = [
            ("2 Bottles (Min):", "$138 + $14.95 US Ship"),
            ("2-Bottle Auto-Ship:", "$98 Bi-Monthly Modal"),
            ("3 Bottles:", "$177 (Free US Ship)"),
            ("6 Bottles:", "$294 (Free US Ship)"),
            ("Return Address:", "Aurora, CO 80011"),
            ("Refund Limit:", "60 Days / 1x Per Buyer"),
            ("Ambiguity Flag:", "Opened-Bottle Wording"),
        ]
        ry = 408
        for k, v in rows:
            draw.text((875, ry), k, fill=(148, 163, 184), font=font_small)
            draw.text((1045, ry), v, fill=(248, 250, 252), font=font_badge)
            ry += 28
        draw.text((875, 604), "Source: joinyusleep.com/buy & refund-policy", fill=(129, 140, 248), font=font_small)
    else:
        # Show YuSleep Bottle + Supplement Facts preview
        if os.path.exists(BOTTLE_IMG):
            b_img = Image.open(BOTTLE_IMG).convert("RGBA")
            b_fit = ImageOps.contain(b_img, (150, 215), method=Image.Resampling.LANCZOS)
            img.paste(b_fit, (875, 372), b_fit)
        draw.text((1035, 385), "YuSleep Liquid", fill=(248, 250, 252), font=font_card_h)
        info_lines = [
            "Size: 2 fl. oz. (60 mL)",
            "Serving: 2 mL (2 droppers)",
            "B2: 0.5 mg (38% DV)",
            "B6: 0.5 mg (29% DV)",
            "Melatonin: 0.9 mg (*)",
            "Blend: 637 mg total",
            "Min Order: 2 Bottles",
        ]
        iy = 418
        for il in info_lines:
            draw.text((1035, iy), il, fill=(203, 213, 225), font=font_small)
            iy += 25

    # Bottom Chapter Progress Bar (y: 646..700)
    draw_rounded_rect(draw, (28, 646, 1252, 700), radius=12, fill=(15, 23, 42), outline=(45, 58, 92), width=1)
    bar_x0, bar_x1 = 48, 1232
    total_w = bar_x1 - bar_x0
    progress_frac = sec["endTimeSec"] / 180.0
    draw_rounded_rect(draw, (bar_x0, 658, bar_x1, 672), radius=6, fill=(30, 41, 59))
    draw_rounded_rect(draw, (bar_x0, 658, int(bar_x0 + total_w * progress_frac), 672), radius=6, fill=(99, 102, 241))
    draw.text(
        (48, 678),
        "Affiliate Disclosure: Purchases through our link may earn a commission. Statements have not been evaluated by the FDA.",
        fill=(148, 163, 184),
        font=font_small,
    )

    img.save(out_png_path, "PNG")


def build_webvtt(plan, out_vtt_path):
    lines = ["WEBVTT", "Kind: captions", "Language: en", ""]
    # For Section 1, use the actual prototype audio narration for 0..30s plus the revised script note
    sec1_cues = [
        (0.0, 7.5, "[Sarah - AI Presenter]: When nights get broken up and you still have to function the next day, it is easy to end up reading product pages at midnight."),
        (7.5, 14.5, "Before you buy anything, let us slow this down and look at what YuSleep actually is."),
        (14.5, 22.8, "I am Sarah, an AI presenter for this prerecorded affiliate overview, and if you use our link, we may earn a commission."),
        (22.8, 30.0, "[Chapter 1 Transition]: Next, we examine the supplied 60 mL bottle, the Supplement Facts panel, and verified merchant terms."),
    ]
    cue_idx = 1
    for s, e, txt in sec1_cues:
        lines.append(str(cue_idx))
        lines.append(f"{format_vtt_time(s)} --> {format_vtt_time(e)}")
        lines.append(txt)
        lines.append("")
        cue_idx += 1

    for sec in plan["sections"][1:]:
        s_start = float(sec["startTimeSec"])
        s_end = float(sec["endTimeSec"])
        dur = s_end - s_start
        # Split spokenScript into sentences
        raw_sentences = [seg.strip() for seg in sec["spokenScript"].replace("? ", "?|").replace(". ", ".|").split("|") if seg.strip()]
        total_chars = max(1, sum(len(x) for x in raw_sentences))
        cursor = s_start
        for i, sent in enumerate(raw_sentences):
            frac = len(sent) / total_chars
            seg_dur = dur * frac
            seg_end = s_end if i == len(raw_sentences) - 1 else round(cursor + seg_dur, 2)
            lines.append(str(cue_idx))
            lines.append(f"{format_vtt_time(cursor)} --> {format_vtt_time(seg_end)}")
            prefix = f"[Section {sec['sectionNumber']} - {sec['title']}]: " if i == 0 else ""
            lines.append(prefix + sent)
            lines.append("")
            cue_idx += 1
            cursor = seg_end

    with open(out_vtt_path, "w", encoding="utf-8") as f:
        f.write("\n".join(lines))


def main():
    with open(PLAN_PATH, "r", encoding="utf-8") as f:
        plan = json.load(f)

    build_webvtt(plan, OUT_VTT)
    print(f"Wrote WebVTT captions to {OUT_VTT}")

    tmp_dir = tempfile.mkdtemp(prefix="yusleep_rough_cut_")
    segment_files = []

    # Section 1: Re-encode the 30s prototype MP4 to standardized 1280x720 30fps H.264 + 44.1kHz stereo AAC
    sec1_mp4 = os.path.join(tmp_dir, "seg_01.mp4")
    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-i",
            PROTOTYPE_MP4,
            "-t",
            "30",
            "-vf",
            "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p",
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-c:a",
            "aac",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-b:a",
            "128k",
            sec1_mp4,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    segment_files.append(sec1_mp4)
    print("Prepared Section 1 (0:00 - 0:30) from existing 30s Sarah AI presenter prototype.")

    # Sections 2..7: Render PNG slide + synthesize local macOS scratch voiceover + pad to exact section duration
    for sec in plan["sections"][1:]:
        sec_num = sec["sectionNumber"]
        dur = int(sec["durationSec"])
        png_path = os.path.join(tmp_dir, f"slide_{sec_num:02d}.png")
        aiff_path = os.path.join(tmp_dir, f"voice_{sec_num:02d}.aiff")
        seg_mp4 = os.path.join(tmp_dir, f"seg_{sec_num:02d}.mp4")

        render_section_slide(sec, png_path)

        # Synthesize scratch narration using local macOS say
        subprocess.run(
            ["/usr/bin/say", "-v", "Samantha", "-r", "165", "-o", aiff_path, sec["spokenScript"]],
            check=True,
        )

        # Combine PNG + padded/trimmed audio into exact `dur` seconds MP4
        subprocess.run(
            [
                "ffmpeg",
                "-y",
                "-loop",
                "1",
                "-framerate",
                "30",
                "-i",
                png_path,
                "-i",
                aiff_path,
                "-t",
                str(dur),
                "-filter_complex",
                f"[1:a]apad=whole_dur={dur}[aout]",
                "-map",
                "0:v",
                "-map",
                "[aout]",
                "-vf",
                "scale=1280:720,format=yuv420p",
                "-c:v",
                "libx264",
                "-preset",
                "veryfast",
                "-tune",
                "stillimage",
                "-crf",
                "22",
                "-c:a",
                "aac",
                "-ar",
                "44100",
                "-ac",
                "2",
                "-b:a",
                "128k",
                "-shortest",
                seg_mp4,
            ],
            check=True,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        segment_files.append(seg_mp4)
        print(f"Prepared Section {sec_num} ({sec['startTimeSec']}s - {sec['endTimeSec']}s, {dur}s): {sec['title']}")

    # Concatenate all 7 segments cleanly
    concat_txt = os.path.join(tmp_dir, "concat.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for seg in segment_files:
            f.write(f"file '{seg}'\n")

    subprocess.run(
        [
            "ffmpeg",
            "-y",
            "-f",
            "concat",
            "-safe",
            "0",
            "-i",
            concat_txt,
            "-c:v",
            "libx264",
            "-preset",
            "veryfast",
            "-crf",
            "22",
            "-c:a",
            "aac",
            "-ar",
            "44100",
            "-ac",
            "2",
            "-b:a",
            "128k",
            "-movflags",
            "+faststart",
            OUT_MP4,
        ],
        check=True,
        stdout=subprocess.DEVNULL,
        stderr=subprocess.DEVNULL,
    )
    print(f"Successfully built full 180s 7-section rough cut MP4 at {OUT_MP4}")


if __name__ == "__main__":
    main()
