import type { Metadata } from "next";
import "./globals.css";
import StoreProvider from "../store/StoreProvider";

export const metadata: Metadata = {
  title: "Annotation Activity Console",
  description: "Internal console for annotator task activity",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
