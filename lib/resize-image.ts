/**
 * Center-crops an image to a square and scales it to `size` px, as a JPEG.
 *
 * Avatars render at 20–40px, so there is no reason to upload a multi-megabyte
 * phone photo — and a small file stays well under the 1 MB body limit on
 * server actions. Browser-only: relies on <img> decoding and <canvas>.
 */
export async function resizeToSquareJpeg(
  file: File,
  size = 256
): Promise<Blob> {
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image()
      el.onload = () => resolve(el)
      // e.g. HEIC on a desktop browser that cannot decode it
      el.onerror = () => reject(new Error("Could not read that image"))
      el.src = url
    })

    const side = Math.min(img.naturalWidth, img.naturalHeight)
    const canvas = document.createElement("canvas")
    canvas.width = size
    canvas.height = size

    const ctx = canvas.getContext("2d")
    if (!ctx) throw new Error("Could not process that image")

    // JPEG has no transparency; paint white so a transparent logo is not black.
    ctx.fillStyle = "#ffffff"
    ctx.fillRect(0, 0, size, size)
    ctx.drawImage(
      img,
      (img.naturalWidth - side) / 2,
      (img.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      size,
      size
    )

    return await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (blob) =>
          blob ? resolve(blob) : reject(new Error("Could not process that image")),
        "image/jpeg",
        0.9
      )
    )
  } finally {
    URL.revokeObjectURL(url)
  }
}
