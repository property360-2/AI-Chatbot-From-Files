import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const mono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

const baseUrl = "https://tropangai.vercel.app";

export const metadata: Metadata = {
  metadataBase: new URL(baseUrl),
  title: {
    default: "Tropang AI | Smart Document Collaboration",
    template: "%s | Tropang AI",
  },
  description: "Your team's intelligent partner for document analysis and RAG-powered search. Chat with your documents using advanced AI.",
  keywords: ["AI", "Document Analysis", "RAG", "Search", "Collaboration", "Tropang AI", "Smart Documents"],
  authors: [{ name: "Tropang AI Team" }],
  creator: "Tropang AI",
  publisher: "Tropang AI",
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  verification: {
    google: "google7f52a8234b6a0bce",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: baseUrl,
    siteName: "Tropang AI",
    title: "Tropang AI | Smart Document Collaboration",
    description: "Your team's intelligent partner for document analysis and RAG-powered search.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Tropang AI Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Tropang AI | Smart Document Collaboration",
    description: "Your team's intelligent partner for document analysis and RAG-powered search.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: baseUrl,
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Tropang AI",
  description: "Smart document collaboration and RAG-powered search platform.",
  url: baseUrl,
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  author: {
    "@type": "Organization",
    name: "Tropang AI",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${mono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
