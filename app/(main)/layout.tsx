import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Newsreader } from "next/font/google";
import "./newpage.css";

const newsreader = Newsreader({
  subsets: ["latin"],
  weight: ["400", "500"],
  style: ["normal", "italic"],
  variable: "--font-newsreader",
});
const plexSans = IBM_Plex_Sans({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-sans" });
const plexMono = IBM_Plex_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-plex-mono" });

export const metadata: Metadata = {
  title: "Eusun Han Lab · Root science, plant phenomics & perennial agronomy",
  icons: { icon: "/newpage/img/logo-symbol.png" },
};

export const viewport = { themeColor: "#1d1915" };

export default function NewPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`newlab ${newsreader.variable} ${plexSans.variable} ${plexMono.variable}`}>
      {children}
    </div>
  );
}
