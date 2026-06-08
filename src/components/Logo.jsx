// BurnWatch logo — flame inside a watch/ring
export default function Logo({ size = 32 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label="BurnWatch logo"
    >
      <defs>
        <radialGradient id="ringGrad" cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor="#00e5ff" stopOpacity="0.15" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="flameGrad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%"   stopColor="#ffb300" />
          <stop offset="55%"  stopColor="#ff6b35" />
          <stop offset="100%" stopColor="#ff4d6d" />
        </linearGradient>
        <linearGradient id="ringStroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%"   stopColor="#00e5ff" />
          <stop offset="100%" stopColor="#00e5ff" stopOpacity="0.3" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="1.2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer ring fill */}
      <circle cx="16" cy="16" r="14" fill="url(#ringGrad)" />

      {/* Outer ring stroke */}
      <circle cx="16" cy="16" r="14" stroke="url(#ringStroke)" strokeWidth="1.5" />

      {/* Inner tick marks */}
      {[0, 60, 120, 180, 240, 300].map((deg, i) => {
        const rad = (deg - 90) * Math.PI / 180
        const x1 = 16 + 11.5 * Math.cos(rad)
        const y1 = 16 + 11.5 * Math.sin(rad)
        const x2 = 16 + 13   * Math.cos(rad)
        const y2 = 16 + 13   * Math.sin(rad)
        return (
          <line
            key={i} x1={x1} y1={y1} x2={x2} y2={y2}
            stroke="#00e5ff" strokeWidth="1" strokeOpacity="0.5"
          />
        )
      })}

      {/* Flame — single organic path */}
      <g filter="url(#glow)">
        <path
          d="M16 26
             C11 26 8 22.5 8 19
             C8 15.5 10.5 14 11 11
             C11.5 8 13 6 14 5
             C14 8 15 9.5 16 10
             C16.5 8.5 17 7 17.5 5.5
             C19 8 20 10 20 13
             C20.5 11.5 21 10 21.5 8.5
             C23 11 24 14 24 17
             C24 22 20.5 26 16 26Z"
          fill="url(#flameGrad)"
        />
        {/* Inner flame highlight */}
        <path
          d="M16 23
             C13.5 23 12 21 12 19
             C12 17 13 16 13.5 14.5
             C14 16 15 17 16 17.5
             C16.5 16 17 14.5 17.5 13
             C18.5 15 19.5 16.5 19.5 18.5
             C19.5 21 18 23 16 23Z"
          fill="#fff"
          fillOpacity="0.25"
        />
      </g>
    </svg>
  )
}
