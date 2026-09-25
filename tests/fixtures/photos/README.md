# Photographic regression corpus

Originals are pinned to [scikit-image v0.25.2](https://github.com/scikit-image/scikit-image/tree/v0.25.2/skimage/data).

| File | Subject / author | License | SHA-256 |
| --- | --- | --- | --- |
| astronaut.png | Eileen Collins portrait / NASA | Public domain | 88431cd9653ccd539741b555fb0a46b61558b301d4110412b5bc28b5e3ea6cb5 |
| coffee.png | Coffee cup and wood grain / Rachel Michetti | CC0 | cc02f8ca188b167c775a7101b5d767d1e71792cf762c33d6fa15a4599b5a8de7 |
| chelsea.png | Cat fur / Stefan van der Walt | CC0 | 596aa1e7cb875eb79f437e310381d26b338a81c2da23439704a73c4651e8c4bb |

Attribution/license source: [scikit-image data documentation](https://scikit-image.org/docs/stable/api/skimage.data).

Run `python scripts/generate-photo-fixtures.py` with Pillow (LittleCMS and WebP enabled) to regenerate derived fixtures. No network or Python is required for normal tests.

- `chelsea-integral.png`: the original 451×300 cat cropped to 450×300 for an exact 5× reduction reference. Fractional-ratio tests still use the untouched original.
- `*-box.png`: independent Pillow BOX downsampling references at integral reduction factors.
- `coffee.jpg`: quality-90 JPEG, no chroma subsampling.
- `coffee.webp`: lossless WebP.
- `coffee-orientation-2.jpg` through `-8.jpg`: identical JPEG image data with each non-default EXIF orientation. Flags were inserted without re-encoding.
- `coffee-srgb.jpg`: identical JPEG image data tagged with a LittleCMS-generated sRGB ICC profile. This tests tagged sRGB, not arbitrary wide-gamut profiles. Profile generation includes a timestamp, so byte hashes of regenerated metadata may differ.
