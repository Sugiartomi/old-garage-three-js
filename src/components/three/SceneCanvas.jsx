import { useEffect, useRef } from 'react'

/**
 * Bridge React → Three.js.
 * onReady(mount) boleh return function cleanup ATAU { dispose }.
 */
export default function SceneCanvas({ onReady }) {
  const mountRef = useRef(null)

  useEffect(() => {
    const mount = mountRef.current
    if (!mount || !onReady) return

    const result = onReady(mount)
    return () => {
      if (typeof result === 'function') result()
      else result?.dispose?.()
    }
  }, [onReady])

  return <div ref={mountRef} className="scene-canvas" />
}
