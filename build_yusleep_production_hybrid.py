#!/usr/bin/env python3
"""
Builds the full production hybrid 7-section YuSleep webinar video
(/public/videos/yusleep-production-webinar.mp4) and synchronized WebVTT captions
(/public/videos/yusleep-webinar-captions.vtt) under Option A:

- Sections 1, 4, 6, 7: Full 720p animated AI Presenter footage (Sarah via inference.sh Fabric 1.0)
  with branded lower-third chapter and disclosure overlays.
- Sections 2, 3, 5: High-resolution visual slide and label cutaways paired with
  authentic Sarah narration (vidIQ/ElevenLabs EXAVITQu4vr4xnSDxMaL).
"""

import json
import os
import subprocess
import tempfile
import textwrap
from PIL import Image, ImageDraw, ImageFont, ImageOps

ROOT = os.path.dirname(os.path.abspath(__file__))
OUT_MP4 = os.path.join(ROOT, "public", "videos", "yusleep-production-webinar.mp4")
OUT_VTT = os.path.join(ROOT, "public", "videos", "yusleep-webinar-captions.vtt")
PLAN_PATH = os.path.join(ROOT, "yusleep-full-production-plan.json")

BOTTLE_IMG = os.path.join(ROOT, "public", "images", "yusleep-bottle.png")
LABEL_IMG = os.path.join(ROOT, "public", "images", "yusleep-supplement-facts.jpg")
PRESENTER_IMG = os.path.join(ROOT, "public", "images", "yusleep-presenter.jpg")

AVATAR_DIR = os.path.join(ROOT, "public", "videos", "avatar")
AUDIO_DIR = os.path.join(ROOT, "public", "audio", "yusleep")

def load_font(size, bold=False):
    candidates = [
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf" if bold else "/System/Library/Fonts/Supplemental/Arial.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial.ttf"
    ]
    for p in candidates:
        if os.path.exists(p):
            try:
                return ImageFont.truetype(p, size)
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

def render_slide(sec_num, title, purpose, bullets, script_text, out_png, right_mode="bottle"):
    width, height = 1280, 720
    img = Image.new("RGB", (width, height), (9, 14, 28))
    draw = ImageDraw.Draw(img)

    for y in range(height):
        r = int(9 + (y / height) * 10)
        g = int(14 + (y / height) * 14)
        b = int(28 + (y / height) * 26)
        draw.line([(0, y), (width, y)], fill=(r, g, b))

    font_badge = load_font(15, bold=True)
    font_small = load_font(15, bold=False)
    font_title = load_font(28, bold=True)
    font_sub = load_font(17, bold=False)
    font_card_h = load_font(19, bold=True)
    font_card_b = load_font(16, bold=False)

    # Top Header Bar
    draw_rounded_rect(draw, (28, 20, 1252, 74), radius=14, fill=(18, 26, 48), outline=(56, 74, 122), width=1)
    draw.text((46, 36), "PRERECORDED AFFILIATE OVERVIEW  |  AI PRESENTER: SARAH (EXAVITQu4vr4xnSDxMaL)", fill=(165, 180, 252), font=font_badge)
    draw_rounded_rect(draw, (790, 28, 1238, 66), radius=10, fill=(30, 41, 75), outline=(99, 102, 241), width=1)
    draw.text((806, 39), f"PRODUCTION SECTION {sec_num} OF 7  (Authentic Voiceover)", fill=(224, 231, 255), font=font_badge)

    # Left Main Content Panel
    draw_rounded_rect(draw, (28, 92, 835, 630), radius=20, fill=(15, 23, 42), outline=(45, 58, 92), width=2)
    draw_rounded_rect(draw, (52, 114, 340, 146), radius=8, fill=(30, 41, 75), outline=(79, 70, 229), width=1)
    draw.text((64, 122), f"SECTION {sec_num} OF 7", fill=(199, 210, 254), font=font_badge)

    title_lines = textwrap.wrap(title, width=44)
    y_cursor = 160
    for line in title_lines:
        draw.text((52, y_cursor), line, fill=(248, 250, 252), font=font_title)
        y_cursor += 36

    purpose_lines = textwrap.wrap("Purpose: " + purpose, width=72)
    y_cursor += 4
    for line in purpose_lines[:2]:
        draw.text((52, y_cursor), line, fill=(148, 163, 184), font=font_sub)
        y_cursor += 22

    y_cursor += 12
    for idx, bullet in enumerate(bullets):
        box_top = y_cursor
        wrapped = textwrap.wrap(bullet, width=64)
        box_h = max(52, 22 + len(wrapped) * 22)
        draw_rounded_rect(draw, (52, box_top, 810, box_top + box_h), radius=12, fill=(23, 33, 58), outline=(67, 83, 128), width=1)
        draw.ellipse((68, box_top + 16, 92, box_top + 40), fill=(79, 70, 229))
        draw.text((76, box_top + 19), str(idx + 1), fill=(255, 255, 255), font=font_badge)
        ty = box_top + 14
        for wline in wrapped:
            draw.text((106, ty), wline, fill=(226, 232, 240), font=font_card_b)
            ty += 22
        y_cursor = box_top + box_h + 10

    # Spoken Script Excerpt Box
    if y_cursor < 545:
        excerpt_top = max(y_cursor + 4, 495)
        draw_rounded_rect(draw, (52, excerpt_top, 810, 612), radius=12, fill=(12, 19, 36), outline=(51, 65, 85), width=1)
        draw.text((68, excerpt_top + 10), "SARAH AUTHENTIC NARRATION:", fill=(129, 140, 248), font=font_badge)
        script_wrapped = textwrap.wrap('"' + script_text + '"', width=76)
        sy = excerpt_top + 32
        for sline in script_wrapped[:3]:
            draw.text((68, sy), sline, fill=(203, 213, 225), font=font_small)
            sy += 21

    # Right Column Cards
    draw_rounded_rect(draw, (855, 92, 1252, 340), radius=18, fill=(15, 23, 42), outline=(99, 102, 241), width=2)
    if os.path.exists(PRESENTER_IMG):
        p_img = Image.open(PRESENTER_IMG).convert("RGB")
        p_crop = ImageOps.fit(p_img, (373, 195), method=Image.Resampling.LANCZOS)
        img.paste(p_crop, (867, 104))
    draw.text((867, 307), "Presenter: Sarah (Authentic ElevenLabs Voice)", fill=(224, 231, 255), font=font_badge)

    draw_rounded_rect(draw, (855, 356, 1252, 630), radius=18, fill=(15, 23, 42), outline=(56, 74, 122), width=2)

    if right_mode == "label" and os.path.exists(LABEL_IMG):
        l_img = Image.open(LABEL_IMG).convert("RGB")
        lw, lh = l_img.size
        l_sub = l_img.crop((0, 0, int(lw * 0.52), lh))
        l_fit = ImageOps.contain(l_sub, (370, 215), method=Image.Resampling.LANCZOS)
        paste_x = 855 + (397 - l_fit.width) // 2
        img.paste(l_fit, (paste_x, 368))
        draw.text((872, 595), "Supplied Supplement Facts Artwork Zoom", fill=(167, 243, 208), font=font_badge)
    elif right_mode == "offer":
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

    # Bottom Disclosure Bar
    draw_rounded_rect(draw, (28, 646, 1252, 700), radius=12, fill=(15, 23, 42), outline=(45, 58, 92), width=1)
    draw.text(
        (48, 668),
        "Affiliate Disclosure: Purchases through our link may earn a commission. Statements not evaluated by FDA. Not medical advice.",
        fill=(148, 163, 184),
        font=font_small,
    )

    img.save(out_png, "PNG")

def main():
    with open(PLAN_PATH, "r", encoding="utf-8") as f:
        plan = json.load(f)

    # Durations measured from generated Sarah TTS audio and avatar videos
    section_timings = [
        {"sec_num": 1, "dur": 32.00, "is_avatar": True, "avatar_file": "sec_1_avatar.mp4"},
        {"sec_num": 2, "dur": 37.25, "is_avatar": False, "audio_file": "sec_2.mp3", "right_mode": "bottle"},
        {"sec_num": 3, "dur": 58.04, "is_avatar": False, "audio_file": "sec_3.mp3", "right_mode": "label"},
        {"sec_num": 4, "dur": 39.88, "is_avatar": True, "avatar_file": "sec_4_avatar.mp4"},
        {"sec_num": 5, "dur": 64.84, "is_avatar": False, "audio_file": "sec_5.mp3", "right_mode": "offer"},
        {"sec_num": 6, "dur": 26.40, "is_avatar": True, "avatar_file": "sec_6_avatar.mp4"},
        {"sec_num": 7, "dur": 19.12, "is_avatar": True, "avatar_file": "sec_7_avatar.mp4"}
    ]

    # Calculate exact timeline offsets
    cur_t = 0.0
    for st in section_timings:
        st["start"] = cur_t
        st["end"] = round(cur_t + st["dur"], 3)
        cur_t = st["end"]

    total_webinar_duration = cur_t
    print(f"Total production webinar duration: {total_webinar_duration:.2f}s (~{int(total_webinar_duration//60)}m {int(total_webinar_duration%60)}s)")

    # Build updated WebVTT captions
    vtt_lines = ["WEBVTT", "Kind: captions", "Language: en", ""]
    cue_idx = 1
    for st in section_timings:
        s_num = st["sec_num"]
        sec_meta = plan["sections"][s_num - 1]
        script = sec_meta["spokenScript"]
        # Split script into sentences
        sentences = [s.strip() for s in script.replace("? ", "?|").replace(". ", ".|").split("|") if s.strip()]
        total_chars = max(1, sum(len(x) for x in sentences))
        s_start = st["start"]
        s_end = st["end"]
        dur = s_end - s_start
        cursor = s_start

        for i, sent in enumerate(sentences):
            seg_dur = dur * (len(sent) / total_chars)
            seg_end = s_end if i == len(sentences) - 1 else round(cursor + seg_dur, 2)
            vtt_lines.append(str(cue_idx))
            vtt_lines.append(f"{format_vtt_time(cursor)} --> {format_vtt_time(seg_end)}")
            prefix = f"[Sarah - Section {s_num}]: " if i == 0 else ""
            vtt_lines.append(prefix + sent)
            vtt_lines.append("")
            cue_idx += 1
            cursor = seg_end

    with open(OUT_VTT, "w", encoding="utf-8") as f:
        f.write("\n".join(vtt_lines))
    print(f"Wrote production WebVTT captions to {OUT_VTT}")

    tmp_dir = tempfile.mkdtemp(prefix="yusleep_prod_")
    segment_mp4s = []

    # Overlay banner to stamp onto avatar segments (transparent PNG)
    overlay_png = os.path.join(tmp_dir, "avatar_overlay.png")
    ov_img = Image.new("RGBA", (1280, 720), (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(ov_img)
    # Bottom banner
    ov_draw.rounded_rectangle((28, 646, 1252, 700), radius=12, fill=(15, 23, 42, 230), outline=(99, 102, 241, 180), width=1)
    font_badge = load_font(14, bold=True)
    ov_draw.text((46, 658), "PRERECORDED AFFILIATE OVERVIEW  |  AI PRESENTER: SARAH (EXAVITQu4vr4xnSDxMaL)", fill=(224, 231, 255, 240), font=font_badge)
    ov_draw.text((46, 678), "Purchases via our link may earn a commission. Statements not evaluated by FDA. Not medical advice.", fill=(148, 163, 184, 220), font=load_font(13))
    ov_img.save(overlay_png, "PNG")

    for st in section_timings:
        s_num = st["sec_num"]
        dur = st["dur"]
        sec_meta = plan["sections"][s_num - 1]
        out_seg = os.path.join(tmp_dir, f"prod_seg_{s_num:02d}.mp4")

        if st["is_avatar"]:
            src_avatar = os.path.join(AVATAR_DIR, st["avatar_file"])
            print(f"Processing Section {s_num} (Presenter Avatar: {st['avatar_file']}, {dur}s)...")
            # Scale avatar to 1280x720, stamp disclosure overlay, ensure 30fps and standardized audio
            subprocess.run([
                "ffmpeg", "-y",
                "-i", src_avatar,
                "-i", overlay_png,
                "-filter_complex",
                "[0:v]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p[bg];"
                "[bg][1:v]overlay=0:0[vout]",
                "-map", "[vout]",
                "-map", "0:a",
                "-t", str(dur),
                "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
                "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "160k",
                out_seg
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            print(f"Rendering Section {s_num} (Visual Slide Cutaway: {st['right_mode']}, {dur}s)...")
            slide_png = os.path.join(tmp_dir, f"slide_{s_num:02d}.png")
            render_slide(
                sec_num=s_num,
                title=sec_meta["title"],
                purpose=sec_meta["purpose"],
                bullets=sec_meta.get("onScreenText", [])[1:],
                script_text=sec_meta["spokenScript"],
                out_png=slide_png,
                right_mode=st["right_mode"]
            )
            src_audio = os.path.join(AUDIO_DIR, st["audio_file"])
            # Combine PNG + authentic Sarah audio
            subprocess.run([
                "ffmpeg", "-y",
                "-loop", "1", "-framerate", "30", "-i", slide_png,
                "-i", src_audio,
                "-t", str(dur),
                "-vf", "scale=1280:720,format=yuv420p",
                "-c:v", "libx264", "-preset", "veryfast", "-tune", "stillimage", "-crf", "20",
                "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "160k",
                "-shortest",
                out_seg
            ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        segment_mp4s.append(out_seg)

    # Concatenate all 7 production segments
    concat_txt = os.path.join(tmp_dir, "concat.txt")
    with open(concat_txt, "w", encoding="utf-8") as f:
        for seg in segment_mp4s:
            f.write(f"file '{seg}'\n")

    print(f"Concatenating all 7 sections into {OUT_MP4}...")
    subprocess.run([
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", concat_txt,
        "-c:v", "libx264", "-preset", "veryfast", "-crf", "20",
        "-c:a", "aac", "-ar", "44100", "-ac", "2", "-b:a", "160k",
        "-movflags", "+faststart",
        OUT_MP4
    ], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Also copy to yusleep-full-rough-cut.mp4 so existing test suites and viewers immediately load this upgraded master video
    shutil_dest = os.path.join(ROOT, "public", "videos", "yusleep-full-rough-cut.mp4")
    subprocess.run(["cp", "-f", OUT_MP4, shutil_dest], check=True)

    print("Production hybrid video assembly complete!")

if __name__ == "__main__":
    main()
