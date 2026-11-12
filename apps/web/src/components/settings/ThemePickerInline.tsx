'use client';

import { useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { useTheme } from '@/theme/ThemeProvider';
import { THEMES, type ThemeName } from '@/theme/themes';
import { patchMe } from '@/lib/users';
import { ThemeCard } from './ThemeCard';

/**
 * The nine themes as a 3x3 grid, on phone and desktop alike. The section's
 * heading and its hint live with the caller, which words them per shell.
 */
export function ThemePickerInline() {
  const { theme, setTheme } = useTheme();
  const { getToken } = useAuth();
  const [isSaving, setIsSaving] = useState(false);

  async function handleSelectTheme(name: ThemeName) {
    if (name === theme || isSaving) return;
    const previous = theme;
    setTheme(name);
    setIsSaving(true);
    try {
      const token = await getToken();
      if (token) {
        await patchMe(token, { theme: name });
      }
    } catch {
      setTheme(previous);
    } finally {
      setIsSaving(false);
    }
  }

  const themeKeys = Object.keys(THEMES) as ThemeName[];

  return (
    <div
      className="grid grid-cols-3 gap-2 sm:gap-3"
      style={{
        opacity: isSaving ? 0.7 : 1,
        transition: 'opacity var(--motion-fast) var(--motion-ease)',
      }}
    >
      {themeKeys.map((name) => (
        <ThemeCard
          key={name}
          name={name}
          active={theme === name}
          disabled={isSaving}
          onClick={() => void handleSelectTheme(name)}
        />
      ))}
    </div>
  );
}
