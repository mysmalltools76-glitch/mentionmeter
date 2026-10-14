import { Bricolage_Grotesque, Instrument_Sans } from "next/font/google";
import { APP_NAME } from "@/lib/config";
import "./globals.css";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", display: "swap" });
const body = Instrument_Sans({ subsets: ["latin"], variable: "--font-body", display: "swap" });

export const metadata = {
  title: `${APP_NAME} — Does AI recommend your brand?`,
  description:
    "Free check: we ask AI the questions your customers ask and show whether your brand gets named, and which competitors do.",
};

export const viewport = { width: "device-width", initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
