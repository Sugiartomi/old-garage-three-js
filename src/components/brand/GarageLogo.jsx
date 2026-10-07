export default function GarageLogo({ className = '' }) {
  return (
    <svg
      className={className}
      viewBox="12 0 236 120"
      role="img"
      aria-label="Old Garage"
    >
      <g fill="none" stroke="#f2f0ea" strokeWidth="2.4">
        <path d="M16 46 L58 16 L100 46" />
        <rect x="24" y="46" width="68" height="58" rx="1.5" />
        <path d="M24 66h68M24 84h68" />
        <rect x="48" y="84" width="20" height="20" />
      </g>
      <text
        x="124"
        y="58"
        fill="#f2f0ea"
        fontFamily="Bebas Neue, Impact, sans-serif"
        fontSize="46"
        letterSpacing="2"
      >
        OLD
      </text>
      <text
        x="124"
        y="102"
        fill="#d4c4a8"
        fontFamily="Bebas Neue, Impact, sans-serif"
        fontSize="46"
        letterSpacing="2"
      >
        GARAGE
      </text>
    </svg>
  )
}
