import { useEffect, useState } from 'react'

function initialTheme(): boolean {
  try {
    const saved = localStorage.getItem('crpe-theme')
    if (saved === 'dark' || saved === 'light') return saved === 'dark'
  } catch { /* Le thème reste utilisable sans stockage. */ }
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const [dark, setDark] = useState(initialTheme)
  useEffect(() => {
    document.documentElement.dataset.theme = dark ? 'dark' : 'light'
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#171e1a' : '#f7f8fa')
    try { localStorage.setItem('crpe-theme', dark ? 'dark' : 'light') } catch { /* Sans persistance. */ }
  }, [dark])
  return { dark, toggleTheme: () => setDark(value => !value) }
}
