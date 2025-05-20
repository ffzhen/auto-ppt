#!/bin/bash

# 保存路径
SAVE_DIR="/Users/kiwii/Documents/字体"
mkdir -p "$SAVE_DIR"

# 字体文件列表
fonts=(
  "SourceHanSerif.woff2"
  "FangZhengHeiTi.woff2"
  "FangZhengKaiTi.woff2"
  "FangZhengShuSong.woff2"
  "FangZhengFangSong.woff2"
  "AlibabaPuHuiTi.woff2"
  "ZhuQueFangSong.woff2"
  "LXGWWenKai.woff2"
  "WenDingPLKaiTi.woff2"
  "DeYiHei.woff2"
  "MiSans.woff2"
  "CangerXiaowanzi.woff2"
  "YousheTitleBlack.woff2"
  "FengguangMingrui.woff2"
  "ShetuModernSquare.woff2"
  "ZcoolHappy.woff2"
  "ZizhiQuXiMai.woff2"
  "SucaiJishiKangkang.woff2"
  "SucaiJishiCoolSquare.woff2"
  "TuniuRounded.woff2"
  "RuiziZhenyan.woff2"
)

# 批量下载
for font in "${fonts[@]}"; do
  url="https://asset.pptist.cn/font/$font"
  echo "正在下载: $font"
  curl -L \
    -H 'Origin: http://127.0.0.1:5173' \
    -H 'sec-ch-ua-platform: "macOS"' \
    -H 'Referer: http://127.0.0.1:5173/' \
    -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36' \
    -H 'sec-ch-ua: "Chromium";v="136", "Google Chrome";v="136", "Not.A/Brand";v="99"' \
    -H 'sec-ch-ua-mobile: ?0' \
    -o "$SAVE_DIR/$font" "$url"
done

echo "所有字体下载完成，保存到 $SAVE_DIR"
