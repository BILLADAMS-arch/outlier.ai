import { useState } from 'react'
import { Icon } from './ui'
import { photoUrl } from '../utils/images'

/** Responsive Unsplash photo with a fixed aspect ratio and an icon fallback when it can't load. */
export default function TaskPhoto({ image, icon = 'fa-briefcase', alt = '', w = 480, h = 300 }) {
  const [failed, setFailed] = useState(false)
  const src = photoUrl(image, w, h)
  const isUnsplash = src && !src.startsWith('data:')
  return (
    <div className="photo">
      <div className="photo-fallback"><Icon name={icon} /></div>
      {src && !failed && (
        <img src={src} alt={alt} loading="lazy" decoding="async" width={w} height={h} onError={() => setFailed(true)}
          srcSet={isUnsplash ? `${photoUrl(image, w / 2, h / 2)} ${w / 2}w, ${src} ${w}w, ${photoUrl(image, w * 2, h * 2)} ${w * 2}w` : undefined}
          sizes={isUnsplash ? `(max-width: 600px) 100vw, ${w}px` : undefined} />
      )}
    </div>
  )
}
