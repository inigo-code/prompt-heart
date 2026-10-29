# Heart Apps brand

The developer brand behind Prompt Heart and Watch Heart: two app tiles leaning into one heart. Regenerate everything here with `node scripts/make-brand.mjs store/developer`.

## Play Console → Developer page

| Field | File | Size |
| --- | --- | --- |
| Developer icon | `play-developer-icon-512.png` | 512 × 512, 32-bit PNG |
| Header image | `play-developer-header-4096x2304.png` | 4096 × 2304, PNG |

The header keeps the logo in the middle third, so it survives the crop on narrow screens.

## Files

- `mark.svg`, `mark-1024.png`: the heart on its own, for dark backgrounds
- `mark-light.svg`: deeper gold and pink for light backgrounds
- `mark-white.svg`, `mark-black.svg`: one colour, for print, watermarks and monochrome icons
- `lockup.svg` / `.png`, `lockup-light.svg` / `.png`: the heart with "Heart Apps" in Inter Display Bold (outlined, so no font is needed)

## Colours

| | Dark backgrounds | Light backgrounds |
| --- | --- | --- |
| Background | `#121110` | `#F6F4EF` |
| Front tile | `#F2B84B` | `#B87A12` |
| Back tile | `#FF4D6D` | `#E8395A` |
| Wordmark | `#F6F4EF` | `#1C1A17` |

Gold, pink and near-black are the colours already in both app icons. On light backgrounds both tiles go deeper, because gold on cream is only 1.6:1.

Keep clear space of at least the heart's lobe width around the mark, and don't recolour, rotate or separate the two tiles.
