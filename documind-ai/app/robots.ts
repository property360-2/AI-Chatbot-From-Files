import { MetadataRoute } from "next";

/**
 * Generates the robots.txt file for the application.
 * This file is automatically handled by Next.js to serve /robots.txt
 * 
 * @returns {MetadataRoute.Robots} The robots configuration
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = "https://tropangai.vercel.app";

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [
        "/api/",      // Disallow crawling API routes
        "/_next/",    // Disallow internal Next.js paths
        "/scratch/",  // Disallow any scratch/dev folders
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
