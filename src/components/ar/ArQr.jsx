import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import QRCode from 'qrcode'

export default function ArQr({ carId }) {
  const [src, setSrc] = useState('')
  const url = `${window.location.origin}/ar/${carId}`
  const isLocal =
    window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  useEffect(() => {
    let cancelled = false
    QRCode.toDataURL(url, {
      margin: 1,
      width: 280,
      color: { dark: '#111111', light: '#ffffff' },
    }).then((dataUrl) => {
      if (!cancelled) setSrc(dataUrl)
    })
    return () => {
      cancelled = true
    }
  }, [url])

  return (
    <div className="detail__ar">
      <div className="detail__ar-desktop">
        {src && <img className="detail__ar-code" src={src} alt="QR code for AR" />}
        <div>
          <p className="detail__ar-label">Scan for AR</p>
          <p className="detail__ar-note">
            Scan this code with an iPhone, then tap Open AR camera.
          </p>
        </div>
      </div>

      <div className="detail__ar-mobile">
        <p className="detail__ar-label">AR camera</p>
        <p className="detail__ar-note">
          This is for iPhone. Open it in Safari, then tap the button on the next page to start the camera.
        </p>
        <Link className="detail__ar-open" to={`/ar/${carId}`}>
          Open AR camera
        </Link>
      </div>
    </div>
  )
}
