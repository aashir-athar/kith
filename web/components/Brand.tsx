// The Kith mark: the Kin monogram (a K whose arms lift into dots) inside a speech bubble.

export function Brand({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 1024 1024" aria-label="Kith" className="brandmark" style={{ borderRadius: size * 0.22 }}>
      <defs>
        <linearGradient id="kb" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ff6b41" />
          <stop offset="1" stopColor="#e8481f" />
        </linearGradient>
      </defs>
      <rect width="1024" height="1024" rx="232" fill="url(#kb)" />
      <path d="M300 604 L300 742 L432 650 Z" fill="#faf7f3" />
      <rect x="206" y="196" width="612" height="470" rx="150" fill="#faf7f3" />
      <g transform="translate(206 122) scale(0.5977)" fill="none" stroke="#ff5a2c" strokeWidth="86" strokeLinecap="round" strokeLinejoin="round">
        <path d="M377 300 L377 724" />
        <path d="M377 512 L601 366" />
        <path d="M377 512 L601 658" />
      </g>
      <g transform="translate(206 122) scale(0.5977)" fill="#ff5a2c">
        <circle cx="629" cy="352" r="58" />
        <circle cx="629" cy="672" r="58" />
      </g>
    </svg>
  );
}
