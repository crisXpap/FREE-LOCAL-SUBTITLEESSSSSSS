import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Subtitles App",
  description: "Client-side video subtitle generator with Transformers.js",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Bangers&family=DM+Sans:ital,opsz,wght@0,9..40,100..1000;1,9..40,100..1000&family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap" 
          rel="stylesheet" 
        />
      </head>
      <body className="min-h-screen bg-[#000000] text-[#E1DCC9] antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
