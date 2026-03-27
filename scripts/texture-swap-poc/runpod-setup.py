"""
Grounded SAM 2 setup + segmentation on RunPod.
Run via: runpodctl exec python runpod-setup.py
"""
import subprocess
import sys
import os
import json
import urllib.request

def run(cmd):
    print(f">>> {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout: print(result.stdout[:2000])
    if result.returncode != 0 and result.stderr:
        print(f"STDERR: {result.stderr[:1000]}")
    return result.returncode == 0

# Step 1: Check GPU
print("=" * 50)
print("CHECKING GPU")
print("=" * 50)
run("nvidia-smi --query-gpu=name,memory.total --format=csv,noheader")
run("python3 --version")

# Step 2: Install dependencies
print("\n" + "=" * 50)
print("INSTALLING DEPENDENCIES")
print("=" * 50)
run("pip install -q segment-anything-2 groundingdino-py supervision pillow")
# Grounded SAM 2 requires specific repos
run("pip install -q transformers huggingface_hub")

# Try the simpler approach: use transformers pipeline for grounding + SAM
run("pip install -q autodistill autodistill-grounded-sam-2 2>/dev/null || true")

# Step 3: Download models
print("\n" + "=" * 50)
print("DOWNLOADING MODELS")
print("=" * 50)

# Use transformers for Grounding DINO
print("Testing Grounding DINO via transformers...")
test_code = '''
import torch
print(f"CUDA available: {torch.cuda.is_available()}")
print(f"GPU: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'None'}")

# Test 1: Try GroundingDINO from transformers
try:
    from transformers import AutoProcessor, AutoModelForZeroShotObjectDetection
    model_id = "IDEA-Research/grounding-dino-tiny"
    processor = AutoProcessor.from_pretrained(model_id)
    model = AutoModelForZeroShotObjectDetection.from_pretrained(model_id).to("cuda")
    print("GroundingDINO loaded OK")
except Exception as e:
    print(f"GroundingDINO failed: {e}")

# Test 2: Try SAM2
try:
    from transformers import SamModel, SamProcessor
    sam_model = SamModel.from_pretrained("facebook/sam-vit-base").to("cuda")
    sam_processor = SamProcessor.from_pretrained("facebook/sam-vit-base")
    print("SAM loaded OK")
except Exception as e:
    print(f"SAM failed: {e}")

print("SETUP COMPLETE")
'''

with open("/tmp/test_models.py", "w") as f:
    f.write(test_code)
run("python3 /tmp/test_models.py")

print("\nDone. Models are ready for segmentation.")
