export const platforms = [
  { key: "youtubeShorts", label: "YouTube Shorts", autoPostStatus: "ready_later" },
  { key: "tiktok", label: "TikTok", autoPostStatus: "approval_required" },
  { key: "instagramReels", label: "Instagram Reels", autoPostStatus: "approval_required" },
  { key: "x", label: "X", autoPostStatus: "credentials_required" },
] as const;

export type PlatformKey = (typeof platforms)[number]["key"];

export function isPlatformKey(value: string): value is PlatformKey {
  return platforms.some((platform) => platform.key === value);
}

export function platformLabel(key: string) {
  return platforms.find((platform) => platform.key === key)?.label ?? key;
}
