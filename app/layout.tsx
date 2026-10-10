import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Abhishek Dhautre — Software Developer",
  description:
    "Abhishek Dhautre is a software developer from Pune building web and mobile products with React, React Native, Java, Spring Boot, Firebase, and modern web technologies.",
  metadataBase: new URL("https://abhishekdhautre.dev"),
  openGraph: {
    title: "Abhishek Dhautre — Software Developer",
    description:
      "Abhishek Dhautre is a software developer from Pune building web and mobile products with React, React Native, Java, Spring Boot, Firebase, and modern web technologies.",
    type: "website",
    url: "https://abhishekdhautre.dev",
  },
  twitter: {
    card: "summary_large_image",
    title: "Abhishek Dhautre — Software Developer",
    description: "Software developer from Pune. Web. Mobile. Systems. Experiments.",
    creator: "@AbhiDhautre",
  },
  alternates: { canonical: "https://abhishekdhautre.dev" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Space+Grotesk:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
