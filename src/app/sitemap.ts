import type { MetadataRoute } from "next";
export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return [
    { url: `${base}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/templates`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/register`, changeFrequency: "yearly", priority: 0.5 },
    { url: `${base}/login`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
