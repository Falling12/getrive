// Standard 4-color Google "G" logomark — Google's own brand guidelines
// require this exact multi-color mark for "Sign in with Google" buttons
// rather than a monochrome stand-in.
export function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.766 12.2764c0-.9175-.0827-1.7999-.2382-2.6501H12.24v5.0919h6.4823c-.2823 1.5309-1.1339 2.8296-2.4315 3.7048v3.0793h3.9401c2.3078-2.1258 3.6389-5.2506 3.6389-9.2259z"
      />
      <path
        fill="#34A853"
        d="M12.24 24c3.24 0 5.9558-1.0748 7.9414-2.9074l-3.9401-3.0793c-1.0928.7315-2.4917 1.1639-4.0013 1.1639-3.1319 0-5.7822-2.1155-6.7276-4.9613H1.4413v3.1732C3.4186 21.5237 7.5237 24 12.24 24z"
      />
      <path
        fill="#FBBC05"
        d="M5.5124 14.2153c-.2422-.7188-.3801-1.4864-.3801-2.2153s.1379-1.4966.3801-2.2153V6.6112H1.4413C.6023 8.2578 0 10.1067 0 12s.6023 3.7422 1.4413 5.3888l4.0711-3.1735z"
      />
      <path
        fill="#EA4335"
        d="M12.24 4.7501c1.7663 0 3.3554.607 4.6035 1.7999l3.4988-3.4988C18.1863.9924 15.4706 0 12.24 0 7.5237 0 3.4186 2.4763 1.4413 6.0111l4.0711 3.1732c.9454-2.8459 3.5957-4.9613 6.7276-4.9613z"
      />
    </svg>
  );
}
