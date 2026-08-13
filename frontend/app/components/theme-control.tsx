import { Moon, Sun } from 'lucide-react';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { IconButton } from '~/lib/bleecker';

type AppTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'theme';

const ThemeContext = createContext<{
  theme: AppTheme;
  toggleTheme: () => void;
} | null>(null);

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<AppTheme>('dark');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setTheme(window.localStorage.getItem(THEME_STORAGE_KEY) === 'light' ? 'light' : 'dark');
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [ready, theme]);

  const value = useMemo(
    () => ({
      theme,
      toggleTheme: () => setTheme((current) => (current === 'dark' ? 'light' : 'dark')),
    }),
    [theme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function ThemeControl({ className }: { className?: string }) {
  const context = useContext(ThemeContext);
  if (!context) return null;

  const isDark = context.theme === 'dark';
  return (
    <IconButton
      aria-label={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      className={className}
      onClick={context.toggleTheme}
      title={`Switch to ${isDark ? 'light' : 'dark'} theme`}
      type="button"
      variant="ghost"
    >
      {isDark ? <Sun size={17} /> : <Moon size={17} />}
    </IconButton>
  );
}
