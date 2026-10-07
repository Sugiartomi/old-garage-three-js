import { useCallback, useRef, useState } from 'react'
import ArQr from '../../components/ar/ArQr'
import GarageBumper from '../../components/brand/GarageBumper'
import SceneCanvas from '../../components/three/SceneCanvas'
import { createShopScene } from '../../three/scenes/ShopScene'
import './Home.css'

export default function Home() {
  const [introHidden, setIntroHidden] = useState(false)
  const [showBumper, setShowBumper] = useState(true)
  const [lotReady, setLotReady] = useState(false)
  const [slots, setSlots] = useState([])
  const [hover, setHover] = useState(null)
  const [selected, setSelected] = useState(null)
  const apiRef = useRef(null)
  const showLanding = !showBumper && lotReady

  const onReady = useCallback((mount) => {
    const api = createShopScene(mount, {
      onHover: setHover,
      onActivity: () => setIntroHidden(true),
      onSelect: (car) => {
        setSelected(car)
        if (!car) setIntroHidden(false)
      },
      onFirstCar: () => setLotReady(true),
      onSlots: setSlots,
    })
    apiRef.current = api
    return api
  }, [])

  const handleBack = () => {
    apiRef.current?.deselect?.()
  }

  return (
    <main className="home home--scene">
      {showBumper && <GarageBumper onDone={() => setShowBumper(false)} />}
      <SceneCanvas onReady={onReady} />

      {!showBumper && !selected &&
        slots
          .filter((slot) => slot.visible)
          .map((slot) => (
            <div
              key={slot.id}
              className="lot-slot"
              style={{ left: slot.x, top: slot.y }}
            >
              <div
                className={`lot-slot__ring${slot.phase === 'unknown' ? ' is-unknown' : ''}`}
                style={{ '--p': slot.phase === 'unknown' ? 0.25 : slot.progress }}
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={Math.round(slot.progress * 100)}
                aria-label={`Loading ${slot.name}`}
              >
                <span>{slot.phase === 'unknown' ? '…' : `${Math.round(slot.progress * 100)}%`}</span>
              </div>
              <p className="lot-slot__name">{slot.name}</p>
            </div>
          ))}

      {/* Hero kiri — baru setelah bumper dan minimal satu mobil tampil */}
      {showLanding && (
      <header
        className={`home__intro ${introHidden || selected ? 'is-hidden' : ''}`}
      >
        <p className="home__eyebrow">Character vehicles, curated</p>
        <h1 className="home__brand">OLD GARAGE</h1>
        <p className="home__desc">
          Old Garage presents used vehicles chosen for character and service
          history, not showroom condition. Hover to see the price, select a
          vehicle to read the inspection notes, then drag the camera to look
          over the lot.
        </p>
      </header>
      )}

      {/* Harga statis kanan bawah (browse only) */}
      {showLanding && !selected && (
        <div className={`price-dock ${hover ? 'is-visible' : ''}`}>
          {hover && (
            <>
              <span className="price-dock__name">{hover.name}</span>
              <strong className="price-dock__price">{hover.price}</strong>
            </>
          )}
        </div>
      )}

      {showLanding && !selected && (
        <p className="home__hint">
          Hover for price · Select a vehicle to inspect · Drag to orbit the camera
        </p>
      )}

      {showLanding && (
      <footer className={`home__credit${selected ? ' is-behind-detail' : ''}`}>
        <p>Portfolio of Tomi Sugiarto -- 2026</p>
        <p>3D design by Renafox3D @ Sketchfab</p>
      </footer>
      )}

      {/* Detail ala game select */}
      {selected && (
        <div className="detail">
          <aside className="detail__panel">
            <button type="button" className="detail__back" onClick={handleBack}>
              ← Back to the lot
            </button>
            <p className="detail__eyebrow">
              {selected.year} · {selected.condition}
            </p>
            <h2 className="detail__title">{selected.name}</h2>
            <p className="detail__price">{selected.price}</p>
            <p className="detail__body">{selected.description}</p>
            <ArQr carId={selected.id} />
            <p className="detail__tip">
              Hover the vehicle to rotate it by hand. Move the cursor away and
              the slow spin resumes.
            </p>
          </aside>
        </div>
      )}
    </main>
  )
}
