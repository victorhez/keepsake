export function LogoMark({ size = 28, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none" className={className} aria-hidden="true">
      <rect x="3" y="9" width="26" height="20" rx="5" fill="currentColor" />
      <rect x="14" y="9" width="4" height="20" fill="var(--ribbon)" />
      <rect x="3" y="15" width="26" height="3.5" fill="var(--ribbon)" />
      <path d="M16 9.5c-2.2-4.6-7.6-6.3-8.6-3.4-.9 2.6 4.1 3.8 8.6 3.4Z" fill="var(--ribbon)" />
      <path d="M16 9.5c2.2-4.6 7.6-6.3 8.6-3.4.9 2.6-4.1 3.8-8.6 3.4Z" fill="var(--ribbon)" />
      <circle cx="16" cy="9.4" r="1.9" fill="var(--ribbon-deep)" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className ?? ""}`}>
      <LogoMark />
      <span className="font-serif text-[1.55rem] leading-none tracking-tight">Keepsake</span>
    </span>
  );
}
