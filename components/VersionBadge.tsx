'use client';

interface VersionBadgeProps {
  version?: string | null;
}

export default function VersionBadge({ version }: VersionBadgeProps) {
  if (!version) {
    return null;
  }

  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium
                 bg-blue-50 text-blue-700 border border-blue-100
                 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800"
      aria-label={`当前版本 ${version}`}
    >
      版本
      <span className="font-semibold">v{version}</span>
    </span>
  );
}
