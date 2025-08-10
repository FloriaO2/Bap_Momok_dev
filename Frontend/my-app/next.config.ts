import type { NextConfig } from "next";

/**
 * 아래 옵션을 추가하면 빌드 시 ESLint/TypeScript 에러를 무시할 수 있습니다.
 * (실서비스에는 권장하지 않지만, 임시 배포/테스트용으로 사용)
 */

const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
