import type { Metadata } from "next";
import "./globals.css";
import { TopNav } from "@/components/TopNav";

export const metadata: Metadata = {
  title: "SnapTag — Tag every play. Know every player.",
  description: "B2B sports data collection for flag football teams.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <TopNav />
        {children}
      </body>
    </html>
  );
}
