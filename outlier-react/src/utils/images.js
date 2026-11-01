export const UNSPLASH_RE = /^https:\/\/images\.unsplash\.com\/(photo-[A-Za-z0-9_-]+)(?:\?.*)?$/

export const unsplashId = (url) => url.match(UNSPLASH_RE)?.[1] ?? null

/** Resolves true if the browser can load the image. */
export const canLoad = (url) =>
  new Promise((resolve) => {
    const i = new Image()
    i.onload = () => resolve(true)
    i.onerror = () => resolve(false)
    i.src = url
  })

export async function checkUnsplashId(id) {
  return canLoad(`https://images.unsplash.com/${id}?auto=format&fit=crop&w=200&h=125&q=60`)
}

/** Crops/resizes an uploaded image to 960x600 JPEG and returns a data URL. */
export function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return reject(new Error('Use a JPEG, PNG or WebP image.'))
    if (file.size > 8e6) return reject(new Error('The image is larger than 8 MB.'))
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => {
      const w = 960, h = 600
      const c = document.createElement('canvas')
      c.width = w
      c.height = h
      const r = Math.max(w / img.width, h / img.height)
      const sw = w / r, sh = h / r
      c.getContext('2d').drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, 0, 0, w, h)
      URL.revokeObjectURL(url)
      resolve(c.toDataURL('image/jpeg', 0.8))
    }
    img.onerror = () => reject(new Error('That file could not be read as an image.'))
    img.src = url
  })
}

/** Unsplash photo id or uploaded data URL -> an <img> source at the requested size. */
export const photoUrl = (image, w, h) => {
  if (!image) return ''
  if (image.startsWith('data:')) return image
  return image.startsWith('photo-') ? `https://images.unsplash.com/${image}?auto=format&fit=crop&w=${w}&h=${h}&q=70` : ''
}
