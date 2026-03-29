import { createContext, use } from "react"

export type Theme = "dark" | "light" | "system"

export type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
}

export const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export const useTheme = () => {
  const context = use(ThemeProviderContext)

  if (context.setTheme === initialState.setTheme)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
