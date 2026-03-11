'use client';

import { useEffect } from 'react';
import { useTheme } from 'next-themes';

const THEME_FAVICONS = {
  light: '/branding/favicon-light.png',
  dark: '/branding/favicon-dark.png',
};

function upsertFaviconLink(rel: string, href: string) {
  let link = document.head.querySelector(
    `link[rel="${rel}"][data-finku-favicon="true"]`
  ) as HTMLLinkElement | null;

  if (!link) {
    link = document.createElement('link');
    link.rel = rel;
    link.type = 'image/png';
    link.setAttribute('data-finku-favicon', 'true');
    document.head.appendChild(link);
  }

  link.href = href;
}

export function ThemeFaviconSync() {
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (!resolvedTheme) {
      return;
    }

    const href =
      resolvedTheme === 'dark' ? THEME_FAVICONS.dark : THEME_FAVICONS.light;

    upsertFaviconLink('icon', href);
    upsertFaviconLink('shortcut icon', href);
  }, [resolvedTheme]);

  return null;
}
