# Madrasa illustration prompt

Use this template for illustrations across the app. Replace the bracketed scene description for each image.

> Create a polished, friendly **2D storybook illustration** for a learning app: **[describe the scene, characters, and main objects]**. Match the supplied reference image's soft painterly finish, rounded shapes, expressive faces, gentle lighting, subtle texture, layered depth, and clean, centered composition. Use a slightly elevated three-quarter view where it suits the scene, with generous padding around the subject.
>
> **Color palette:** warm ivory `#FFF2D9`, paper white `#FFF9F0`, terracotta `#E77757`, muted coral `#F18A68`, deep cocoa `#49352E`, leaf green `#527F37`, bright moss `#8CB52E`, and restrained slate blue `#29445A`. Keep colors warm and harmonious with softly shaded edges.
>
> Dress characters modestly in natural, age-appropriate clothing. For female characters, use a simple, neatly draped headscarf when appropriate. Let the characters and their activity carry the scene. **Do not add crescents, mosques, calligraphy, geometric religious motifs, or other Islamic symbols unless the scene specifically calls for them.** Avoid exaggerated religious styling or decorative symbolism.
>
> Keep the illustration readable at small app sizes. No photorealism, glossy 3D look, text, lettering, logos, UI, borders, or watermarks. Make the outer background genuinely transparent, including the corners. Export a **square, high-resolution RGBA PNG**.

## Convert an approved PNG to optimized WebP

Keep the PNG as the source file. Convert a copy for the app with Sharp, preserving transparency:

```bash
node -e 'const sharp = require("sharp"); sharp(process.argv[1]).resize({ width: 1200, height: 1200, fit: "inside", withoutEnlargement: true }).webp({ quality: 82, effort: 6 }).toFile(process.argv[2]);' input.png public/images/section/name.webp
```

Check the WebP at its actual display size. Increase `quality` if small facial features or fine lines look blurred.
