import { useEffect, useState, useMemo, useCallback } from "react"
import { Theme, ThemeProviderContext } from "./theme-context"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  storageKey?: string
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  storageKey = "vite-ui-theme",
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem(storageKey)
    if (storedTheme === "light" || storedTheme === "dark" || storedTheme === "system") {
      return storedTheme as Theme
    }
    return defaultTheme
  })

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  const setThemeCallback = useCallback(
    (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    [storageKey]
  )

  const value = useMemo(
    () => ({
      theme,
      setTheme: setThemeCallback,
    }),
    [theme, setThemeCallback]
  )

  return (
    <ThemeProviderContext.Provider value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}
