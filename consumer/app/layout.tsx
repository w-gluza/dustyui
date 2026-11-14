import type { ReactNode } from "react";
import "dustyui/tokens.css";
import "dustyui/themes/mono.css";
import "./globals.css";

export const metadata = { title: "DustyUI consumer check" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
