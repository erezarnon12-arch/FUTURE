import { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://future-beryl-tau.vercel.app";
  const now = new Date();

  return [
    { url: base, lastModified: now },
    { url: `${base}/plans/managed`, lastModified: now },
    { url: `${base}/plans/learn`, lastModified: now },
    { url: `${base}/learn/future`, lastModified: now },
    { url: `${base}/learn/security`, lastModified: now },
    { url: `${base}/learn/growth`, lastModified: now },
    { url: `${base}/learn/glossary`, lastModified: now },
    { url: `${base}/search`, lastModified: now },
  ];
}
