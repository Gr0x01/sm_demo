#!/usr/bin/env python3
"""
OmniGen2 instruction-based image editing test — no masks needed.

Tests maskless editing with reference swatch images on actual SM room photos.
"""
import sys
import os
import time
import torch
import urllib.request
from pathlib import Path
from PIL import Image
import io

OUTPUT_DIR = Path("/workspace/outputs/omnigen2")
MODEL_DIR = "/workspace/models/omnigen2"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

SUPABASE_BASE = "https://lvocfwlgesfphcswzraf.supabase.co/storage/v1/object/public"

ROOM_PHOTOS = {
    "kitchen": f"{SUPABASE_BASE}/rooms/364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp",
}

SWATCHES = {
    "cabinet_onyx": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png",
    "cabinet_driftwood": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/cabinets/COLOR__0020_DRIFTWOOD_TSP.png",
    "counter_calacatta": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/countertops/COUNTER-TOP---QUARTZ---CALACATTA-DUOLINA.jpg",
    "counter_lace_white": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/countertops/COUNTER-TOP---QUARTZ---LACE-WHITE.jpg",
}


def download_image(url: str, name: str) -> Image.Image:
    cache_path = Path(f"/workspace/outputs/_cache_{name}")
    if cache_path.exists():
        print(f"  Cached: {name}")
        return Image.open(cache_path).convert("RGB")
    print(f"  Downloading: {name}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Finch-Test/1.0"})
    data = urllib.request.urlopen(req).read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img.save(cache_path, "PNG")
    return img


# Test cases - instruction-based editing WITH swatch reference images
TEST_CASES = [
    {
        "name": "01_dark_cabinets_with_swatch",
        "room": "kitchen",
        "prompt": "Change all the kitchen cabinet color in this photo to match the dark black painted finish shown in <img0>. Keep the room layout, appliances, countertops, flooring, and lighting exactly the same.",
        "ref_images": ["cabinet_onyx"],
        "image_guidance_scale": 1.5,
    },
    {
        "name": "02_dark_cabinets_text_only",
        "room": "kitchen",
        "prompt": "Change all the kitchen cabinets in this photo to a dark onyx black painted finish. Keep the room layout, perspective, appliances, countertops, backsplash, flooring, and lighting exactly the same. Only change the cabinet color.",
        "ref_images": [],
        "image_guidance_scale": 1.5,
    },
    {
        "name": "03_calacatta_counter_with_swatch",
        "room": "kitchen",
        "prompt": "Change only the countertops in this kitchen photo to match the calacatta marble-look quartz shown in <img0>. Keep cabinets, backsplash, appliances, flooring, and layout exactly the same.",
        "ref_images": ["counter_calacatta"],
        "image_guidance_scale": 1.5,
    },
    {
        "name": "04_multi_change_with_swatches",
        "room": "kitchen",
        "prompt": "In this kitchen photo, make these changes: 1) Change cabinet color to the light driftwood stain shown in <img0>. 2) Change countertops to the white quartz shown in <img1>. Keep the room layout, appliances, backsplash, flooring, and lighting exactly the same.",
        "ref_images": ["cabinet_driftwood", "counter_lace_white"],
        "image_guidance_scale": 1.5,
    },
    {
        "name": "05_multi_change_high_guidance",
        "room": "kitchen",
        "prompt": "In this kitchen photo, make these changes: 1) Change cabinet color to the light driftwood stain shown in <img0>. 2) Change countertops to the white quartz shown in <img1>. Keep the room layout, appliances, backsplash, flooring, and lighting exactly the same.",
        "ref_images": ["cabinet_driftwood", "counter_lace_white"],
        "image_guidance_scale": 2.0,
    },
]


def run_tests():
    print("=== Downloading test images ===")
    rooms = {}
    for name, url in ROOM_PHOTOS.items():
        rooms[name] = download_image(url, f"room_{name}")
        print(f"  {name}: {rooms[name].size}")

    swatch_imgs = {}
    for name, url in SWATCHES.items():
        swatch_imgs[name] = download_image(url, f"swatch_{name}")
        print(f"  {name}: {swatch_imgs[name].size}")

    print("\n=== Loading OmniGen2 ===")
    t0 = time.time()

    from diffusers import OmniGen2Pipeline

    pipe = OmniGen2Pipeline.from_pretrained(
        MODEL_DIR,
        torch_dtype=torch.bfloat16,
    )
    pipe.to("cuda")
    load_time = time.time() - t0
    print(f"Model loaded in {load_time:.1f}s")

    allocated = torch.cuda.memory_allocated() / 1e9
    print(f"VRAM after load: {allocated:.1f}GB")

    print("\n=== Running test cases ===")
    for tc in TEST_CASES:
        name = tc["name"]
        room_img = rooms[tc["room"]]
        prompt = tc["prompt"]

        # Resize for testing
        room_resized = room_img.copy()
        room_resized.thumbnail((1024, 768), Image.LANCZOS)
        w, h = room_resized.size
        w = (w // 16) * 16
        h = (h // 16) * 16
        room_resized = room_resized.resize((w, h), Image.LANCZOS)

        # Build input images list: room photo first, then any swatch references
        input_images = [room_resized]
        for ref_name in tc.get("ref_images", []):
            input_images.append(swatch_imgs[ref_name])

        print(f"\n--- {name} ---")
        print(f"  Prompt: {prompt[:80]}...")
        print(f"  Input images: {len(input_images)} (room + {len(input_images)-1} swatches)")
        print(f"  Guidance scale: {tc.get('image_guidance_scale', 1.5)}")

        t0 = time.time()
        try:
            result = pipe(
                prompt=prompt,
                input_images=input_images,
                height=h,
                width=w,
                image_guidance_scale=tc.get("image_guidance_scale", 1.5),
                num_inference_steps=30,
            )
            gen_time = time.time() - t0
            output_img = result.images[0]
            output_path = OUTPUT_DIR / f"{name}.png"
            output_img.save(output_path)
            print(f"  Generated in {gen_time:.1f}s -> {output_path}")
        except Exception as e:
            print(f"  FAILED: {e}")
            import traceback
            traceback.print_exc()

    # Save input for reference
    room_resized.save(OUTPUT_DIR / "input_kitchen.png")

    print(f"\n=== COMPLETE ===")
    print(f"Peak VRAM: {torch.cuda.max_memory_allocated() / 1e9:.1f}GB")
    print(f"Outputs: {OUTPUT_DIR}")


if __name__ == "__main__":
    run_tests()
