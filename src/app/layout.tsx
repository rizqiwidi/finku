import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { QueryProvider } from "@/components/providers/query-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ThemeFaviconSync } from "@/components/theme-favicon-sync";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "Finku";
const SITE_TITLE = "Finku | Manajemen Keuangan Pribadi";
const SITE_DESCRIPTION =
  "Catat pemasukan dan pengeluaran, atur anggaran bulanan, scan struk OCR, dan import transaksi lebih cepat di Finku.";
const SITE_KEYWORDS = [
  "finku",
  "finance",
  "personal finance",
  "expense tracker",
  "budget planner",
  "money management",
  "financial management",
  "manajemen keuangan",
  "anggaran",
  "catatan keuangan",
];
const OG_IMAGE_PATH = "/opengraph-image?v=logo-v2";

function resolveMetadataBase(headerList: { get(name: string): string | null }) {
  const host =
    headerList.get("x-forwarded-host") ?? headerList.get("host") ?? "localhost:3000";
  const protocol =
    headerList.get("x-forwarded-proto") ??
    (host.includes("localhost") ? "http" : "https");

  return new URL(`${protocol}://${host}`);
}

export const viewport: Viewport = {
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7fbf8" },
    { media: "(prefers-color-scheme: dark)", color: "#081311" },
  ],
};

export async function generateMetadata(): Promise<Metadata> {
  const metadataBase = resolveMetadataBase(await headers());

  return {
    metadataBase,
    applicationName: SITE_NAME,
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    keywords: SITE_KEYWORDS,
    authors: [{ name: "Finku Team" }],
    manifest: "/manifest.webmanifest",
    alternates: {
      canonical: "/",
    },
    icons: {
      icon: [
        {
          url: "/branding/favicon-light.png",
          type: "image/png",
          media: "(prefers-color-scheme: light)",
        },
        {
          url: "/branding/favicon-dark.png",
          type: "image/png",
          media: "(prefers-color-scheme: dark)",
        },
      ],
      shortcut: "/branding/favicon-light.png",
      apple: "/branding/apple-touch-icon.png",
    },
    openGraph: {
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      url: "/",
      siteName: SITE_NAME,
      locale: "id_ID",
      type: "website",
      images: [
        {
          url: OG_IMAGE_PATH,
          width: 1200,
          height: 630,
          alt: "Logo Finku",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: SITE_TITLE,
      description: SITE_DESCRIPTION,
      images: [OG_IMAGE_PATH],
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <AuthProvider>
          <QueryProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="system"
              enableSystem
              disableTransitionOnChange
            >
              <ThemeFaviconSync />
              {children}
              <Toaster />
            </ThemeProvider>
          </QueryProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
