import { useEffect, useRef, useState } from 'react'
import GarageLogo from './GarageLogo'
import './GarageBumper.css'

const TYPE_TEXT_DESKTOP = 'Junk · Gems · Lot'
const TYPE_TEXT_MOBILE = 'Junk ·\nGems ·\nLot'
const TYPE_MS = 72
const HOLD_AFTER_TYPE_MS = 580
const LOGO_FADE_MS = 750
const HOLD_AFTER_LOGO_MS = 520
const EXIT_MS = 280

export default function GarageBumper({ onDone }) {
  const [phase, setPhase] = useState(null)
  const [typed, setTyped] = useState('')
  const [showCaret, setShowCaret] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const timers = useRef([])

  useEffect(() => {
    const clear = () => {
      timers.current.forEach((id) => window.clearTimeout(id))
      timers.current = []
    }

    const later = (fn, ms) => {
      const id = window.setTimeout(fn, ms)
      timers.current.push(id)
    }

    const finish = () => {
      setPhase('gone')
      onDoneRef.current?.()
    }

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduce) {
      finish()
      return clear
    }

    const mobile = window.matchMedia('(max-width: 639px)').matches
    setIsMobile(mobile)
    const typeText = mobile ? TYPE_TEXT_MOBILE : TYPE_TEXT_DESKTOP

    setPhase('idle')
    setTyped('')
    setShowCaret(true)

    later(() => {
      setPhase('typing')
      let i = 0
      const tick = () => {
        i += 1
        setTyped(typeText.slice(0, i))
        if (i < typeText.length) {
          later(tick, TYPE_MS)
        } else {
          later(() => {
            setPhase('logo')
            later(() => {
              setPhase('hold')
              later(() => {
                setPhase('exit')
                later(finish, EXIT_MS)
              }, HOLD_AFTER_LOGO_MS)
            }, LOGO_FADE_MS + 120)
          }, HOLD_AFTER_TYPE_MS)
        }
      }
      later(tick, TYPE_MS)
    }, 380)

    return clear
  }, [])

  useEffect(() => {
    if (phase !== 'typing' && phase !== 'logo' && phase !== 'hold') return undefined
    const id = window.setInterval(() => setShowCaret((value) => !value), 480)
    return () => window.clearInterval(id)
  }, [phase])

  useEffect(() => {
    if (phase === 'gone' || phase === null) return undefined
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [phase])

  if (phase === null || phase === 'gone') return null

  const showLogo = phase === 'logo' || phase === 'hold' || phase === 'exit'
  const caretOn = (phase === 'typing' || phase === 'logo' || phase === 'hold') && showCaret

  return (
    <div className={`garage-bumper${phase === 'exit' ? ' is-exit' : ''}`} role="presentation">
      <div className="garage-bumper__inner">
        <div className="garage-bumper__logo-wrap">
          <div
            className={`garage-bumper__logo${showLogo ? ' is-visible' : ''}`}
            style={{ transitionDuration: `${LOGO_FADE_MS}ms` }}
          >
            <GarageLogo className="garage-bumper__logo-img" />
          </div>
        </div>
        <p className={`garage-bumper__type${isMobile ? ' is-mobile' : ''}`}>
          <span>{typed}</span>
          <span className="garage-bumper__caret" style={{ opacity: caretOn ? 1 : 0 }}>
            |
          </span>
        </p>
      </div>
    </div>
  )
}
