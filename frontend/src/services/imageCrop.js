/**
 * Crops an image using Canvas API and returns a File
 * @param {string} imageUrl - URL of the source image
 * @param {Object} crop - Pixel crop { x, y, width, height }
 * @returns {Promise<File>} Cropped image file
 */
export async function getCroppedImage(imageUrl, crop) {
  const img = new Image()
  img.crossOrigin = 'anonymous'
  img.src = imageUrl

  await new Promise((resolve, reject) => {
    img.onload = resolve
    img.onerror = reject
  })

  const canvas = document.createElement('canvas')
  canvas.width = crop.width
  canvas.height = crop.height
  const ctx = canvas.getContext('2d')

  ctx.drawImage(
    img,
    crop.x, crop.y, crop.width, crop.height,
    0, 0, crop.width, crop.height
  )

  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('Failed to create cropped image'))
      const file = new File([blob], 'cropped.jpg', { type: 'image/jpeg', lastModified: Date.now() })
      resolve(file)
    }, 'image/jpeg', 0.92)
  })
}
