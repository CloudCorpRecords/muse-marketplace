export type ListingKind = "avatar" | "persona" | "voice" | "bundle";

export interface Author { name: string; handle: string; }
export interface AvatarMode { id: string; label: string; asset: string; loop: boolean; }
export interface FileEntry { path: string; sha256: string; bytes: number; mediaType: string; }
export interface Preview { static: string; animated: string; }
export interface Compatibility { muse: string; }
export interface Safety { vetted: boolean; notes: string; }
export interface Listing {
  slug: string;
  name: string;
  kind: ListingKind;
  version: string;
  author: Author;
  description: string;
  longDescription: string;
  tags: string[];
  license: string;
  modes?: AvatarMode[];
  files: FileEntry[];
  preview: Preview;
  compatibility: Compatibility;
  safety: Safety;
  createdAt: string;
  updatedAt: string;
  bundleContents?: string[];
}
export interface RegistryIndex {
  version: number;
  generatedAt: string;
  description: string;
  counts: Record<string, number>;
  listings: Listing[];
}
export interface InstallReceipt {
  slug: string;
  version: string;
  installedAt: string;
  dest: string;
  files: FileEntry[];
  verified: boolean;
}
