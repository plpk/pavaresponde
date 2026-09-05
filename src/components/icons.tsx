export function MicIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.1" strokeLinecap="round" aria-hidden="true">
      <path d="M12 3.5a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0v-5a3 3 0 0 1 3-3Z" fill="#fff" stroke="none" />
      <path d="M5.5 11.2a6.5 6.5 0 0 0 13 0" />
      <path d="M12 17.7V21" />
    </svg>
  );
}

export function PhoneIcon({ size = 16, color = "currentColor" }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true">
      <path d="M6.6 3h3.1l1.6 4-2.1 1.6a11 11 0 0 0 6.2 6.2l1.6-2.1 4 1.6v3.1A2.6 2.6 0 0 1 18.4 20 15.4 15.4 0 0 1 4 5.6 2.6 2.6 0 0 1 6.6 3Z" />
    </svg>
  );
}

export function SignalOffIcon({ size = 26 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#C4161C" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
      <path d="M2 8.5A15 15 0 0 1 22 8.5" />
      <path d="M6 12.5a10 10 0 0 1 12 0" />
      <path d="M12 20h.01" />
      <path d="M19 4L5 18" />
    </svg>
  );
}
