import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // Link antigo de convite continua funcionando
      { source: "/cadastro-afiliado", destination: "/cadastro-parceiro", permanent: true },
    ];
  },
};

export default nextConfig;
