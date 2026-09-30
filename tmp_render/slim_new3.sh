#!/bin/bash
# 三新件瘦身：slim6压贴图 + gltfpack减面
cd /Coze/Drive/实现梦想小助理/所有对话/主对话/jsjwl-site/tmp_render
for spec in "cable 0.25" "alcoholp 0.12" "wipepaper 0.06"; do
  set -- $spec; f=$1; si=$2
  python3 slim6.py $f.glb ${f}-tex.glb 768 2>&1 | tail -2
  cp ${f}-tex.glb ${f}-tmp.glb
  npx gltfpack -kn -slb -si $si -i ${f}-tmp.glb -o ${f}-parts.glb 2>&1 | tail -1
done
echo ALL_DONE
