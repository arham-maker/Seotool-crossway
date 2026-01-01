/** @type {import('next').NextConfig} */
const nextConfig = {
  // Use webpack instead of Turbopack (Turbopack has issues with MongoDB on Windows)
  // Set empty turbopack config to silence the warning
  turbopack: {},
  
  // Ensure MongoDB and other native modules are handled correctly
  webpack: (config, { isServer }) => {
    // Exclude MongoDB and other native modules from client-side bundling
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    
    // Ensure MongoDB is only bundled server-side
    if (isServer) {
      config.externals = config.externals || [];
    }
    
    return config;
  },
};

module.exports = nextConfig;

