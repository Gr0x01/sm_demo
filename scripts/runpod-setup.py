#!/usr/bin/env python3
"""Setup and verify GPU on RunPod pod."""
import subprocess
import sys

def run(cmd):
    print(f"\n>>> {cmd}")
    result = subprocess.run(cmd, shell=True, capture_output=True, text=True)
    if result.stdout:
        print(result.stdout)
    if result.stderr:
        print(result.stderr)
    return result.returncode

# Check GPU
run("nvidia-smi")

# Check PyTorch + CUDA
import torch
print(f"\nPyTorch: {torch.__version__}")
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"GPU: {torch.cuda.get_device_name(0)}")
    print(f"VRAM: {torch.cuda.get_device_properties(0).total_mem / 1e9:.1f} GB")

# Install diffusers and deps
run("pip install -q diffusers transformers accelerate sentencepiece protobuf")

# Verify install
import importlib
for pkg in ["diffusers", "transformers", "accelerate"]:
    mod = importlib.import_module(pkg)
    print(f"{pkg}: {mod.__version__}")

print("\n=== SETUP COMPLETE ===")
