# cli expression to get the contents of `https://cdn.jsdelivr.net/npm/@mediapipe/hands`

files=(
  "hands.js"
  "hands_solution_simd_wasm_bin.js"
  "hands_solution_packed_assets_loader.js"
  "hands.binarypb"
  "hands_solution_packed_assets.data"
  "hands_solution_simd_wasm_bin.wasm"
  "hands_solution_simd_wasm_bin.data"
  "hand_landmark_full.tflite"
  "hand_landmark_lite.tflite"
)

for file in "${files[@]}"; do
  wget "https://cdn.jsdelivr.net/npm/@mediapipe/hands@0.4.1675469240/${file}"
done

