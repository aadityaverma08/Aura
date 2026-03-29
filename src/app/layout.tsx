import type { Metadata } from "next";
import { Cinzel_Decorative, Urbanist } from "next/font/google";
import "./globals.css";

const cinzel = Cinzel_Decorative({
  variable: "--font-cinzel",
  subsets: ["latin"],
  weight: ["400", "700"],
});

const urbanist = Urbanist({
  variable: "--font-urbanist",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aura",
  description: "Your personalized AI celestial guide.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${cinzel.variable} ${urbanist.variable}`}>
      <body>
        <div className="container">
          {children}
        </div>
      </body>
    </html>
  );
}
