#!/usr/bin/env bash

set -euo pipefail

usage() {
  cat <<'EOF'
用法: scripts/run-batch.sh -i <keywords.txt> [选项]

选项:
  -i  关键词文件路径（每行一个，必填）
  -o  输出CSV路径（默认: ./results/amazon-results-时间戳.csv）
  -z  邮编（可选）
  -c  并发数（默认: 1）
  -r  错误批次最大重跑轮数（默认: 1）
  -H  启用有头模式（默认无头）
  -h  显示帮助

环境变量:
  OSS_REGION / OSS_BUCKET / OSS_ACCESS_KEY_ID / OSS_ACCESS_KEY_SECRET / OSS_PREFIX / OSS_ENDPOINT
  WECHAT_WEBHOOK_URL
  MAX_SEARCH_RESULTS / MIN_MONTH_SALES / MAX_REVIEWS
EOF
}

INPUT_FILE=""
OUTPUT_FILE=""
ZIP_CODE=""
CONCURRENCY=1
MAX_RETRY_ROUNDS=1
HEADLESS=true

while getopts ":i:o:z:c:r:Hh" opt; do
  case "$opt" in
    i) INPUT_FILE="$OPTARG" ;;
    o) OUTPUT_FILE="$OPTARG" ;;
    z) ZIP_CODE="$OPTARG" ;;
    c) CONCURRENCY="$OPTARG" ;;
    r) MAX_RETRY_ROUNDS="$OPTARG" ;;
    H) HEADLESS=false ;;
    h) usage; exit 0 ;;
    \?) echo "未知参数: -$OPTARG" >&2; usage; exit 1 ;;
    :) echo "参数 -$OPTARG 缺少值" >&2; usage; exit 1 ;;
  esac
done

if [[ -z "$INPUT_FILE" ]]; then
  echo "错误: 必须通过 -i 指定关键词文件" >&2
  usage
  exit 1
fi

if [[ ! -f "$INPUT_FILE" ]]; then
  echo "错误: 找不到关键词文件 $INPUT_FILE" >&2
  exit 1
fi

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
OUTPUT_FILE=${OUTPUT_FILE:-"./results/amazon-results-${TIMESTAMP}.csv"}
mkdir -p "$(dirname "$OUTPUT_FILE")"

CMD=(npm run batch -- \
  --input "$INPUT_FILE" \
  --output "$OUTPUT_FILE" \
  --concurrency "$CONCURRENCY" \
  --maxRetryRounds "$MAX_RETRY_ROUNDS")

if [[ -n "$ZIP_CODE" ]]; then
  CMD+=(--zip "$ZIP_CODE")
fi

if [[ "$HEADLESS" == false ]]; then
  CMD+=(--no-headless)
fi

echo "运行命令: ${CMD[*]}"
"${CMD[@]}"
