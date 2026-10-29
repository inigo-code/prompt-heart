# Heart Apps brand

The developer brand behind every Heart app: a smiling app tile whose heart-shaped eye has just popped out, love-struck. Every app we make, free, is meant to get that reaction. The face is what keeps the mark readable at 32px, where the hole alone is only a few pixels. The tile stands for any app rather than counting them, so the mark stays the same however many apps there are.

The heart is an accent, never the whole picture. It's how both app icons use it (on Prompt Heart's card, in Watch Heart's reel), and it keeps the brand away from health apps, where one big red heart is the stock symbol. Regenerate everything here with `node scripts/make-brand.mjs store/developer`.

## Play Console → Developer page

| Field | File | Size |
| --- | --- | --- |
| Developer icon | `play-developer-icon-512.png` | 512 × 512, 32-bit PNG |
| Header image | `play-developer-header-4096x2304.png` | 4096 × 2304, PNG |

The header keeps the logo in the middle third, so it survives the crop on narrow screens.

## Files

- `mark.svg`, `mark-1024.png`: the tile and heart on their own, for dark backgrounds
- `mark-light.svg`: deeper gold and pink for light backgrounds
- `mark-tight.svg`: the same mark cropped close, for site headers and favicons
- `apple-touch-icon-180.png`: the home-screen icon for the website
- `mark-white.svg`, `mark-black.svg`: one colour, for print, watermarks and monochrome icons
- `lockup.svg` / `.png`, `lockup-light.svg` / `.png`: the mark with "Heart Apps" in Inter Display Bold (outlined, so no font is needed)

## Colours

| | Dark backgrounds | Light backgrounds |
| --- | --- | --- |
| Background | `#121110` | `#F6F4EF` |
| Tile | `#F2B84B` | `#B87A12` |
| Heart | `#FF4D6D` | `#E8395A` |
| Wordmark | `#F6F4EF` | `#1C1A17` |

Gold, pink and near-black come from the app icons. On light backgrounds the tile and heart go deeper, because gold on cream is only 1.6:1.

Keep clear space of at least the heart's width around the mark. The eyes, the smile and the ring around the flying heart are cut out, not painted, so the mark works on any background. Don't recolour it, rotate it, fill the hole, or move the heart away from its corner.

The face echoes Prompt Heart's on purpose (an eye, a heart, a smile), but on an upright tile instead of a tilted stack of cards, so the two still tell apart at 48px. New app icons shouldn't use a face with a heart eye, or the family blurs.

## Adding an app

The developer mark never changes when an app is added, and the header names no apps, so neither needs regenerating. What keeps a new app in the family is its icon, which follows the rules Prompt Heart and Watch Heart already share:

- Near-black background (`#121110`), full bleed.
- One bold, flat object that says what the app does (a note card, a film reel), in gold `#F2B84B`.
- A heart built into that object, not stuck beside it: on the card, in the reel's hub. Use pink `#FF4D6D` for it, so the heart is the one accent across every icon.
- No text, and no gradients beyond a faint background glow.

Because every icon is gold on near-black, apps tell apart by **silhouette**. Before settling on a new icon, look at it at 48 px beside the others: if two shapes are similar (two round objects, two cards), change the object, not the colour.

Don't reuse the developer mark as an app icon, or build an app icon from a heart popping out of something. Those belong to Heart Apps itself, and an app that wears them reads as the developer account.

Keep the heart small inside its object, and avoid health cues around it: no plus signs, pulse lines, pills or red-on-white.
