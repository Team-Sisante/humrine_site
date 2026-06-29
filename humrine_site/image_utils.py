# humrine_site/image_utils.py
"""
Shared helper for downscaling uploaded images to a maximum width.

Used by blog.Post, blog.PostImage, and toons.ToonPanel's save() methods so
visitors don't download full-resolution source art for every page view.
Width targets follow current webtoon/web-image convention (see project
task notes): 800px for toon panels, 1200px for blog images.
"""

from PIL import Image as PILImage


def resize_image_field(image_field, max_width):
    """
    If `image_field`'s file is wider than `max_width`, downscale it in
    place (same file, same format), preserving aspect ratio. No-op if the
    image is already at or under `max_width`, missing, or unreadable —
    safe to call on every save(), not just the first.
    """
    if not image_field:
        return
    try:
        img = PILImage.open(image_field.path)
    except (FileNotFoundError, OSError):
        return

    if img.width <= max_width:
        return

    original_format = img.format  # e.g. 'JPEG', 'PNG' — preserve it
    ratio = max_width / float(img.width)
    new_height = round(img.height * ratio)
    resized = img.resize((max_width, new_height), PILImage.LANCZOS)

    save_kwargs = {}
    if original_format == 'JPEG':
        # JPEG has no alpha channel — flatten before saving or Pillow errors.
        if resized.mode in ('RGBA', 'P'):
            resized = resized.convert('RGB')
        save_kwargs = {'quality': 85, 'optimize': True}
    elif original_format == 'PNG':
        save_kwargs = {'optimize': True}

    resized.save(image_field.path, format=original_format, **save_kwargs)
