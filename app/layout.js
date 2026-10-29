import "./globals.css";
import { COURSE } from "@/lib/config";

export const metadata = {
  title: COURSE.title,
  description: COURSE.tagline,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
