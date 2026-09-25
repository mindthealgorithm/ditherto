"""Regenerate encoding/metadata fixtures and independent Pillow BOX references.
Requires Pillow with LittleCMS and WebP. Original CC0/public-domain inputs are
pinned in tests/fixtures/photos/README.md. Generated files are committed so
normal tests need neither Python nor network access.
"""
from pathlib import Path
from PIL import Image, ImageCms
import hashlib

root = Path(__file__).resolve().parents[1] / 'tests/fixtures/photos'
for name, divisor in [('astronaut', 8), ('coffee', 5), ('chelsea', 5)]:
    image = Image.open(root / f'{name}.png').convert('RGB')
    # Chelsea is 451 px wide; crop one column for an integral 5x BOX oracle.
    if name == 'chelsea':
        image = image.crop((0, 0, 450, 300))
        image.save(root / 'chelsea-integral.png')
    image.resize((image.width // divisor, image.height // divisor), Image.Resampling.BOX).save(root / f'{name}-box.png')

coffee = Image.open(root / 'coffee.png').convert('RGB')
coffee.save(root / 'coffee.jpg', quality=90, subsampling=0)
coffee.save(root / 'coffee.webp', lossless=True)
base = (root / 'coffee.jpg').read_bytes()
# Insert metadata without re-encoding: orientation and ICC comparisons therefore
# isolate metadata handling from lossy encoder differences.
for orientation in range(2, 9):
    exif = Image.Exif()
    exif[274] = orientation
    payload = exif.tobytes()
    marker = b'\xff\xe1' + (len(payload) + 2).to_bytes(2, 'big') + payload
    (root / f'coffee-orientation-{orientation}.jpg').write_bytes(base[:2] + marker + base[2:])
profile = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()
payload = b'ICC_PROFILE\0\x01\x01' + profile
marker = b'\xff\xe2' + (len(payload) + 2).to_bytes(2, 'big') + payload
(root / 'coffee-srgb.jpg').write_bytes(base[:2] + marker + base[2:])
for name in ['astronaut', 'coffee', 'chelsea']:
    print(name, hashlib.sha256((root / f'{name}.png').read_bytes()).hexdigest())
