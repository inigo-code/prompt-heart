#!/usr/bin/env bash
# bash render.sh  -> dist/: store screenshots, feature graphic, README art
SP="$(cygpath -m "$(cd "$(dirname "$0")" && pwd)")"
C="/c/Program Files/Google/Chrome/Application/chrome.exe"
mkdir -p "$SP/dist/screenshots"
r() { "$C" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=$4 --window-size=$2,$3 --virtual-time-budget=1500 --screenshot="$(cygpath -w "$SP/dist/$5")" "file:///$SP/art.html?s=$1" 2>/dev/null; }
for i in 01 02 03 04 05 06; do r $i 1080 1920 1 screenshots/$i.png & done; wait
r feature 1024 500 1 feature-graphic.png & r hero 1200 645 2 hero.png & r gallery 1200 486 2 gallery.png & r newin 1200 486 2 new.png & wait
ls -la "$SP/dist" "$SP/dist/screenshots" | awk '{print $5, $9}'
