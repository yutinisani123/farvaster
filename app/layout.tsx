import type { Metadata } from "next";

import { buildFrameEmbed } from "@/lib/farcaster";
import { getAppDescription, getAppName, getBaseUrl } from "@/lib/env";

import "./globals.css";

const appName = getAppName();
const appDescription = getAppDescription();
const baseUrl = getBaseUrl();

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: appName,
  description: appDescription,
  applicationName: appName,
  openGraph: {
    title: appName,
    description: appDescription,
    url: baseUrl,
    siteName: appName,
    images: [
      {
        url: "/feed.svg",
        width: 1200,
        height: 800,
        alt: appName,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: appName,
    description: appDescription,
    images: ["/feed.svg"],
  },
  icons: {
    icon: "/icon.svg",
    apple: "/icon.svg",
  },
  other: {
    "fc:frame": JSON.stringify(buildFrameEmbed()),
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

