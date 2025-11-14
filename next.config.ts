import type { NextConfig } from "next";
import { execSync } from "node:child_process";

const getGitTag = () => {
  try {
    const tag = execSync("git describe --tags --abbrev=0", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
    return tag || null;
  } catch {
    return null;
  }
};

const getShortCommit = () => {
  try {
    return execSync("git rev-parse --short HEAD", {
      stdio: ["ignore", "pipe", "ignore"],
    })
      .toString()
      .trim();
  } catch {
    return null;
  }
};

const resolveAppVersion = () => {
  if (process.env.NEXT_PUBLIC_APP_VERSION) {
    return process.env.NEXT_PUBLIC_APP_VERSION;
  }
  return getGitTag() ?? getShortCommit() ?? "dev";
};

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_APP_VERSION: resolveAppVersion(),
  },
};

export default nextConfig;
