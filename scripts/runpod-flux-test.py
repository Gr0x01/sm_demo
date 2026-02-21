#!/usr/bin/env python3
"""
FLUX.1 Fill inpainting test — compare against gpt-image-1.5 for Finch use case.

Runs on RunPod A100 pod. Downloads test images from Supabase Storage,
runs FLUX Fill inpainting, saves outputs to /workspace/outputs/.

Usage: python3 /workspace/runpod-flux-test.py
"""
import sys
import os
import time
import torch
import urllib.request
from pathlib import Path
from PIL import Image
import io

OUTPUT_DIR = Path("/workspace/outputs")
MODEL_DIR = Path("/workspace/models/flux-fill-dev")
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

# --- Test images from Supabase Storage ---
SUPABASE_BASE = "https://lvocfwlgesfphcswzraf.supabase.co/storage/v1/object/public"

ROOM_PHOTOS = {
    "kitchen": f"{SUPABASE_BASE}/rooms/364538bf-1712-48e7-a905-04ad90983eb2/rooms/d3b60a74-1ee6-4dd1-a313-99d636f5a7b2/kitchen-close.webp",
    "greatroom": f"{SUPABASE_BASE}/rooms/364538bf-1712-48e7-a905-04ad90983eb2/rooms/50d25549-eba5-424d-8d40-9fe70ff45b1d/greatroom-wide.webp",
    "bath": f"{SUPABASE_BASE}/rooms/364538bf-1712-48e7-a905-04ad90983eb2/rooms/c9346ee2-1486-45ec-8f26-c252ffd167cd/primary-bath-vanity.webp",
}

SWATCHES = {
    "cabinet_driftwood": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/cabinets/COLOR__0020_DRIFTWOOD_TSP.png",
    "cabinet_onyx": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/cabinets/KITCHEN-CABINET-COLOR---ONYX-PAINT-1.png",
    "counter_lace_white": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/countertops/COUNTER-TOP---QUARTZ---LACE-WHITE.jpg",
    "counter_calacatta": f"{SUPABASE_BASE}/swatches/364538bf-1712-48e7-a905-04ad90983eb2/countertops/COUNTER-TOP---QUARTZ---CALACATTA-DUOLINA.jpg",
}

# --- Test cases: room + prompt + which swatches to reference ---
TEST_CASES = [
    {
        "name": "kitchen_dark_cabinets",
        "room": "kitchen",
        "prompt": (
            "In this kitchen photo, change ONLY the cabinet color to a dark onyx/black painted finish. "
            "Match the color and finish of the reference swatch image exactly. "
            "Keep everything else identical — countertops, backsplash, appliances, flooring, lighting, layout. "
            "Preserve all cabinet door panel geometry, seams, and hardware positions."
        ),
        "swatch": "cabinet_onyx",
    },
    {
        "name": "kitchen_light_cabinets_white_counter",
        "room": "kitchen",
        "prompt": (
            "In this kitchen photo, make two changes: "
            "1. Change the cabinet color to a light driftwood stain — match swatch #1 exactly. "
            "2. Change the countertops to white quartz — match swatch #2 exactly. "
            "Keep everything else identical — backsplash, appliances, flooring, lighting, layout. "
            "Preserve all cabinet door panel geometry and hardware."
        ),
        "swatches_list": ["cabinet_driftwood", "counter_lace_white"],
    },
    {
        "name": "kitchen_calacatta_counter",
        "room": "kitchen",
        "prompt": (
            "In this kitchen photo, change ONLY the countertops to a calacatta marble-look quartz. "
            "Match the veining pattern and color of the reference swatch image exactly. "
            "Keep cabinets, backsplash, appliances, flooring, and layout completely unchanged."
        ),
        "swatch": "counter_calacatta",
    },
]


def download_image(url: str, name: str) -> Image.Image:
    """Download an image from URL and return as PIL Image."""
    cache_path = OUTPUT_DIR / f"_cache_{name}"
    if cache_path.exists():
        print(f"  Using cached: {name}")
        return Image.open(cache_path)

    print(f"  Downloading: {name}...")
    req = urllib.request.Request(url, headers={"User-Agent": "Finch-Test/1.0"})
    data = urllib.request.urlopen(req).read()
    img = Image.open(io.BytesIO(data)).convert("RGB")
    img.save(cache_path, "PNG")
    return img


def create_full_mask(image: Image.Image) -> Image.Image:
    """Create a full white mask (edit everywhere) matching image size."""
    return Image.new("RGB", image.size, (255, 255, 255))


def run_flux_fill_test():
    """Load FLUX Fill and run test cases."""
    from diffusers import FluxFillPipeline

    print("\n=== Loading FLUX.1 Fill model ===")
    t0 = time.time()
    pipe = FluxFillPipeline.from_pretrained(
        str(MODEL_DIR),
        torch_dtype=torch.bfloat16,
    )
    pipe.to("cuda")
    load_time = time.time() - t0
    print(f"Model loaded in {load_time:.1f}s")

    # Report VRAM usage
    allocated = torch.cuda.memory_allocated() / 1e9
    reserved = torch.cuda.memory_reserved() / 1e9
    print(f"VRAM: {allocated:.1f}GB allocated, {reserved:.1f}GB reserved")

    # Download test images
    print("\n=== Downloading test images ===")
    rooms = {}
    for name, url in ROOM_PHOTOS.items():
        rooms[name] = download_image(url, f"room_{name}")
        print(f"  {name}: {rooms[name].size}")

    swatches = {}
    for name, url in SWATCHES.items():
        swatches[name] = download_image(url, f"swatch_{name}")
        print(f"  {name}: {swatches[name].size}")

    # Run test cases
    print("\n=== Running test cases ===")
    for tc in TEST_CASES:
        name = tc["name"]
        room_img = rooms[tc["room"]]
        prompt = tc["prompt"]

        print(f"\n--- Test: {name} ---")
        print(f"  Room: {tc['room']} ({room_img.size})")
        print(f"  Prompt: {prompt[:80]}...")

        # Resize room to 1024x768 for faster testing (FLUX supports variable sizes)
        room_resized = room_img.copy()
        room_resized.thumbnail((1024, 768), Image.LANCZOS)
        # Ensure dimensions are multiples of 16 (required by FLUX)
        w, h = room_resized.size
        w = (w // 16) * 16
        h = (h // 16) * 16
        room_resized = room_resized.resize((w, h), Image.LANCZOS)

        mask = create_full_mask(room_resized)

        print(f"  Generation size: {room_resized.size}")

        t0 = time.time()
        result = pipe(
            prompt=prompt,
            image=room_resized,
            mask_image=mask,
            height=h,
            width=w,
            num_inference_steps=28,
            guidance_scale=30,
        )
        gen_time = time.time() - t0

        output_img = result.images[0]
        output_path = OUTPUT_DIR / f"{name}.png"
        output_img.save(output_path)
        print(f"  Generated in {gen_time:.1f}s")
        print(f"  Saved to: {output_path}")

        # Also save the input for comparison
        room_resized.save(OUTPUT_DIR / f"{name}_input.png")

    print("\n=== ALL TESTS COMPLETE ===")
    print(f"Outputs saved to: {OUTPUT_DIR}")

    # Summary
    vram_peak = torch.cuda.max_memory_allocated() / 1e9
    print(f"\nPeak VRAM usage: {vram_peak:.1f}GB")


if __name__ == "__main__":
    run_flux_fill_test()
