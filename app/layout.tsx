import type { Metadata } from "next";
import { loadSettings } from "./lib/content";
import { plainText } from "./lib/format-text";
import { siteUrl } from "./lib/site-url";
import { ScrollToTop } from "./scroll-to-top";
import "./globals.css";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const [{ data: settings }, base] = await Promise.all([
    loadSettings(),
    siteUrl(),
  ]);
  const title = plainText(settings.lab_name || "Eusun Han's Lab");
  const description = plainText(settings.introduction || settings.tagline);

  return {
    metadataBase: base,
    title,
    description,
    verification: {
      google: "9NavC6PkeksjflkUKBlff4SYQS8OD5U9ds1qdJPx0WM",
    },
    openGraph: {
      title,
      description,
      type: "website",
      images: [{ url: "/og.png", width: 1536, height: 1024 }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ScrollToTop />
        {children}
      </body>
    </html>
  );
}
