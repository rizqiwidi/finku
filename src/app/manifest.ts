import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Finku Financial Management',
    short_name: 'Finku',
    description:
      'Catat pemasukan dan pengeluaran, atur anggaran, scan struk, dan import transaksi di Finku.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f7fbf8',
    theme_color: '#10b981',
    lang: 'id-ID',
    icons: [
      {
        src: '/branding/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/branding/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  };
}
