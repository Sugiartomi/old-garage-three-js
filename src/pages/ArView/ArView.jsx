import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import * as THREE from 'three'
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { USDZExporter } from 'three/addons/exporters/USDZExporter.js'
import { CARS } from '../../three/data/cars'
import '@google/model-viewer'
import './ArView.css'

const isIos = () =>
  (/iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

const isAndroid = () => /Android/i.test(navigator.userAgent)

/** Panjang mobil di AR, dalam meter. 100% di iPhone = ukuran ini. */
const AR_SIZE_METERS = 1.2

function prepareForAr(root) {
  const planes = []
  root.traverse((child) => {
    if (!child.isMesh) return
    const label = `${child.name} ${child.parent?.name ?? ''}`.toLowerCase()
    if (label.includes('plane')) planes.push(child)
  })
  planes.forEach((mesh) => mesh.removeFromParent())

  const box = new THREE.Box3().setFromObject(root)
  const size = box.getSize(new THREE.Vector3())
  const maxAxis = Math.max(size.x, size.y, size.z) || 1
  root.scale.setScalar(AR_SIZE_METERS / maxAxis)
  root.updateMatrixWorld(true)

  const fitted = new THREE.Box3().setFromObject(root)
  const center = fitted.getCenter(new THREE.Vector3())
  root.position.x -= center.x
  root.position.z -= center.z
  root.position.y -= fitted.min.y
  root.updateMatrixWorld(true)
}

export default function ArView() {
  const { id } = useParams()
  const car = CARS.find((item) => item.id === id)
  const viewerRef = useRef(null)
  const usdzRef = useRef('')
  const [usdzReady, setUsdzReady] = useState(false)
  const [arError, setArError] = useState('')

  useEffect(() => {
    if (!car) return undefined
    let cancelled = false
    setUsdzReady(false)
    setArError('')

    const prepare = async () => {
      const gltf = await new GLTFLoader().loadAsync(car.url)
      prepareForAr(gltf.scene)
      const buffer = await new USDZExporter().parseAsync(gltf.scene)
      if (cancelled) return
      const blob = new Blob([buffer], { type: 'model/vnd.usdz+zip' })
      const url = URL.createObjectURL(blob)
      usdzRef.current = url
      setUsdzReady(true)
    }

    prepare().catch(() => {
      if (!cancelled) setArError('File AR gagal disiapkan. Muat ulang halaman ini.')
    })

    return () => {
      cancelled = true
      if (usdzRef.current) {
        URL.revokeObjectURL(usdzRef.current)
        usdzRef.current = ''
      }
    }
  }, [car])

  const openIosQuickLook = () => {
    const href = usdzRef.current
    if (!href) return false
    const anchor = document.createElement('a')
    anchor.rel = 'ar'
    anchor.href = href
    const img = document.createElement('img')
    anchor.appendChild(img)
    anchor.style.display = 'none'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    return true
  }

  const openAr = async () => {
    setArError('')

    if (isIos()) {
      if (!usdzReady) {
        setArError('The AR model is still being prepared. Wait a moment, then tap again.')
        return
      }
      openIosQuickLook()
      return
    }

    if (isAndroid()) {
      const viewer = viewerRef.current
      if (!viewer?.activateAR) {
        setArError('The AR viewer is not ready yet. Reload this page.')
        return
      }
      try {
        await viewer.activateAR()
      } catch {
        setArError('The AR camera could not be opened in this Android browser.')
      }
      return
    }

    setArError(
      'This button does not start the camera on a computer. Scan the QR code with an iPhone, then tap the same button there.',
    )
  }

  if (!car) {
    return (
      <main className="ar-view">
        <p className="ar-view__missing">Vehicle not found.</p>
        <Link to="/" className="ar-view__back">
          ← Back to the lot
        </Link>
      </main>
    )
  }

  return (
    <main className="ar-view">
      <header className="ar-view__bar">
        <Link to="/" className="ar-view__back">
          ← Lot
        </Link>
        <div>
          <h1 className="ar-view__title">{car.name}</h1>
          <p className="ar-view__price">{car.price}</p>
        </div>
      </header>

      <model-viewer
        ref={viewerRef}
        className="ar-view__model"
        src={car.url}
        alt={car.name}
        ar=""
        ar-modes="webxr scene-viewer quick-look"
        camera-controls=""
        auto-rotate=""
        shadow-intensity="1"
        environment-image="neutral"
      />

      <button type="button" className="ar-view__launch" onClick={openAr}>
        {isIos() && !usdzReady ? 'Preparing AR…' : 'Open AR camera'}
      </button>
      {arError && <p className="ar-view__error">{arError}</p>}
    </main>
  )
}
