import re, urllib.parse
def thumb(original_url, width):
    """Standard-size Commons thumbnail on upload.wikimedia.org for an original file URL."""
    p = original_url.split("?")[0]
    m = re.match(r"https://upload\.wikimedia\.org/wikipedia/commons/([0-9a-f])/([0-9a-f]{2})/(.+)$", p)
    name = m.group(3)
    ext = ".png" if name.lower().endswith((".tif", ".tiff")) else ""
    return f"https://upload.wikimedia.org/wikipedia/commons/thumb/{m.group(1)}/{m.group(2)}/{name}/{width}px-{name}{ext}"
