import { useLayoutEffect, useRef, useState } from 'react'

const photos = [
  { id: 'front', label: 'Chính diện' },
  { id: 'left', label: 'Chéo trái' },
  { id: 'right', label: 'Chéo phải' },
] as const

export default function SupperPhotos() {
  const [selected, setSelected] = useState(0)
  const [zoomed, setZoomed] = useState(false)
  const frame = useRef<HTMLDivElement>(null)
  const photo = photos[selected]

  const centerPhoto = () => {
    const view = frame.current!
    view.scrollTo((view.scrollWidth - view.clientWidth) / 2,
      (view.scrollHeight - view.clientHeight) * 0.65)
  }

  useLayoutEffect(centerPhoto, [selected, zoomed])

  return <main className="supper-vr supper-photos">
    <header className="supper-vr-header">
      <a href="?view=supper180">← VR180</a>
      <h1>Bữa Tiệc Ly · Ảnh chi tiết</h1>
    </header>
    <div className={zoomed ? 'supper-photo-frame zoomed' : 'supper-photo-frame'} ref={frame}>
      <img key={photo.id} src={`${import.meta.env.BASE_URL}supper180/photo-${photo.id}.jpg`}
        alt={`Bữa Tiệc Ly nhìn từ góc ${photo.label.toLowerCase()}`}
        draggable={false} onLoad={centerPhoto} />
    </div>
    <nav className="supper-photo-controls" aria-label="Góc ảnh và thu phóng">
      {photos.map(({ id, label }, index) => <button key={id} type="button"
        aria-pressed={selected === index} onClick={() => {
          setSelected(index)
          setZoomed(false)
        }}>{label}</button>)}
      <button type="button" onClick={() => setZoomed(!zoomed)}>{zoomed ? 'Thu nhỏ' : 'Phóng to'}</button>
    </nav>
  </main>
}
