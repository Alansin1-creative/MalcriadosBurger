/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['tesseract.js', 'sharp', 'better-sqlite3'],
  // Firebase App Hosting desactiva la optimización de imágenes por defecto en Cloud Run.
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
