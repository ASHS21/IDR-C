// Air-gapped friendly: no next/font/google (which fetches from Google at build/dev time and
// hangs in offline/restricted environments). The actual font stacks are defined as the
// --font-sans / --font-mono / --font-arabic CSS variables in app/globals.css.
//
// These shims preserve the `.variable` className interface used by app/layout.tsx, so no other
// code needs to change. The classNames are intentionally empty — the variables live in :root.

export const plexSans = { variable: '' }
export const plexMono = { variable: '' }
export const plexArabic = { variable: '' }
