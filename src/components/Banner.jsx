import Logo from './Logo.jsx'

export default function Banner({ darkMode, onThemeToggle }) {
  return (
    <header className="bw-banner">
      <div className="bw-banner__left">
        <Logo size={36} />
        <div className="bw-banner__wordmark">
          <span className="bw-banner__burn">burn</span>
          <span className="bw-banner__watch">watch</span>
          <span className="bw-banner__tag">Claude usage monitor</span>
        </div>
      </div>

      <div className="bw-banner__right">
        <div className="bw-banner__pill">
          <span className="live-dot" style={{ width: 6, height: 6 }} />
          <span>live</span>
        </div>
      </div>
    </header>
  )
}
