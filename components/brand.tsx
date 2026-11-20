import Link from 'next/link';

export function Brand() {
  return <Link href="/" className="brand" aria-label="BIEŻNIK — strona główna">
    <svg className="brand-mark" viewBox="0 0 42 35" aria-hidden="true" fill="currentColor">
      <path d="m14 2 26 0-4.2 7.2H9.8L14 2ZM8.1 12h24l-4.2 7.2H4l4.1-7.2ZM2.3 22h23.8l-5.8 10H0l2.3-10Z"/>
    </svg>
    <span className="wordmark">BIEŻNIK<span>.</span><small>TYRE &amp; WHEEL STUDIO</small></span>
  </Link>;
}
