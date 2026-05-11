import { MetadataRoute } from "next";

/**
 * Generates the sitemap for the application.
 * This file is automatically handled by Next.js to serve /sitemap.xml
 * 
 * @returns {MetadataRoute.Sitemap} The sitemap configuration
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://tropangai.vercel.app";

  return [
    {
      url: baseUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1,
    },
    {
      url: `${baseUrl}/legal`,
      lastModified: new Date(),
      changeFrequency: "monthly",
      priority: 0.5,
    },
  ];
}
