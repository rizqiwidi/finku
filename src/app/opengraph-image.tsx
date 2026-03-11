import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const size = {
  width: 1200,
  height: 630,
};

export const alt = 'Finku Financial Management';
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
          padding: '56px',
          background:
            'linear-gradient(135deg, #f7fbf8 0%, #ecfdf5 42%, #ccfbf1 100%)',
          color: '#052e16',
          fontFamily: 'sans-serif',
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            height: '100%',
            justifyContent: 'space-between',
            alignItems: 'stretch',
            padding: '48px',
            borderRadius: '40px',
            background: 'rgba(255, 255, 255, 0.92)',
            border: '1px solid rgba(16, 185, 129, 0.18)',
          }}
        >
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-between',
              maxWidth: '650px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '28px',
              }}
            >
              <img src={logoSrc} width="140" height="140" alt="Finku logo" />
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                }}
              >
                <div style={{ fontSize: 60, fontWeight: 800, lineHeight: 1 }}>
                  Finku
                </div>
                <div
                  style={{
                    marginTop: '10px',
                    fontSize: 26,
                    fontWeight: 600,
                    letterSpacing: '0.24em',
                    textTransform: 'uppercase',
                    color: '#0f766e',
                  }}
                >
                  Financial Management
                </div>
              </div>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '18px',
              }}
            >
              <div
                style={{
                  fontSize: 48,
                  fontWeight: 800,
                  lineHeight: 1.12,
                }}
              >
                Kelola pemasukan, pengeluaran, dan anggaran dalam satu dashboard.
              </div>
              <div
                style={{
                  fontSize: 28,
                  lineHeight: 1.4,
                  color: '#475569',
                }}
              >
                Next.js, Prisma, Supabase, OCR struk, dan draft transaksi berbasis
                AI untuk alur keuangan yang lebih cepat.
              </div>
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              gap: '18px',
              minWidth: '290px',
              padding: '30px 32px',
              borderRadius: '32px',
              background: 'linear-gradient(180deg, #10b981 0%, #14b8a6 100%)',
              color: '#ffffff',
            }}
          >
            <div style={{ fontSize: 24, opacity: 0.9 }}>Ringkas dan terpusat</div>
            <div style={{ fontSize: 34, fontWeight: 800 }}>Finance Control</div>
            <div style={{ fontSize: 24, lineHeight: 1.45 }}>
              Pantau cashflow, kategori, budgeting, dan aktivitas user dari satu
              aplikasi.
            </div>
          </div>
        </div>
      </div>
    ),
    size
  );
}
