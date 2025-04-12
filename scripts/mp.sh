#!/bin/zsh

# Install MediaPipe dependencies
pnpm install @mediapipe/hands @mediapipe/camera_utils @mediapipe/drawing_utils

# Create necessary directories
mkdir -p public/assets/mediapipe/hands

# Copy model files from node_modules to public directory
cp -r node_modules/@mediapipe/hands/*.tflite public/assets/mediapipe/hands/
cp -r node_modules/@mediapipe/hands/*.wasm public/assets/mediapipe/hands/
cp -r node_modules/@mediapipe/hands/*.data public/assets/mediapipe/hands/
cp -r node_modules/@mediapipe/hands/*.json public/assets/mediapipe/hands/

echo "MediaPipe setup complete!"

# runr: `lightsaber % ./mediapipe.sh`
# usage: perplexity.ai/search/turn-this-into-an-easy-to-run-2jGkDrT8Rnan3cDz8K1Akg
