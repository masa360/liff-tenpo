import type { NextConfig } from 'next';
import path from 'path';

/** 親リポジトリに別 lockfile があると Turbopack がルートを誤推論するため明示（npm は store-booking 直下で実行） */
const nextConfig: NextConfig = {
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
