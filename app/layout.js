import "./globals.css";
import { Playfair_Display, Poppins } from "next/font/google";
import { COURSE } from "@/lib/config";
import VisitTracker from "@/components/VisitTracker";

const display = Playfair_Display({
  subsets: ["latin"],
  weight: ["700", "800"],
  variable: "--font-display",
  fallback: ["Georgia", "Times New Roman", "serif"],
  display: "swap",
});

const sans = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-sans",
  fallback: ["system-ui", "Segoe UI", "Roboto", "Arial", "sans-serif"],
  display: "swap",
});

export const metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL?.trim() || "http://localhost:3000"),
  title: COURSE.title,
  description: COURSE.tagline,
  openGraph: {
    title: COURSE.title,
    description: `${COURSE.tagline} Starting ${COURSE.startShort}.`,
    images: ["/flyer.png"],
  },
};

export const viewport = { themeColor: "#fbf1e4" };

export default function RootLayout({ children }) {
  return (

    <html lang="en" className={`${display.variable} ${sans.variable}`}>
    
      <body>
        <VisitTracker />
        {children}
      </body>
    </html>
  );
}