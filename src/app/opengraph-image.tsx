import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const alt = 'Logo Finku';
export const contentType = 'image/png';

async function getLogoDataUri() {
  const logoBuffer = await readFile(
    join(process.cwd(), 'public', 'branding', 'finku-black-512.png')
  );

  return `data:image/png;base64,${logoBuffer.toString('base64')}`;
}

export default async function OpenGraphImage() {
  const logoSrc = await getLogoDataUri();

  return new ImageResponse(
    (
      <div
        style={{
          display: 'flex',
          height: '100%',
          width: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          background:
            'radial-gradient(circle at top left, rgba(16, 185, 129, 0.22), transparent 34%), radial-gradient(circle at bottom right, rgba(20, 184, 166, 0.18), transparent 28%), linear-gradient(135deg, #f7fbf8 0%, #eef7f5 48%, #f8fcfb 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            height: '430px',
            width: '430px',
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: '120px',
            background: 'rgba(255, 255, 255, 0.96)',
            boxShadow: '0 30px 90px rgba(15, 23, 42, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.12)',
          }}
        >
          <img src={logoSrc} width="280" height="280" alt="Finku logo" />
        </div>
      </div>
    ),
    size
  );
}
