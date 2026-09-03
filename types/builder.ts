// File: types/builder.ts

/**
 * TypeScript types for Masjid Web Builder API
 */

// ─── Component Types ──────────────────────────────────────────────────────────

export type ComponentType =
  | "div"
  | "HeaderComponent"
  | "ParagraphComponent"
  | "ImageComponent"
  | "ButtonComponent"
  | "SectionComponent"
  | "CardComponent"
  | "FooterComponent"
  | string; // Allow custom component types

// ─── Component Node ───────────────────────────────────────────────────────────

export interface ComponentNode {
  type: ComponentType;
  props: {
    [key: string]: any;
    style?: React.CSSProperties;
    text?: string;
    src?: string;
    alt?: string;
    href?: string;
    className?: string;
  };
  children: ComponentNode[];
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export interface Layout {
  root: ComponentNode;
}

// ─── Builder Content ──────────────────────────────────────────────────────────

export interface BuilderContent {
  layout: Layout;
  version: number;
  layoutUpdatedAt: string;
  publishedAt?: string | null;
}

// ─── Masjid Info ──────────────────────────────────────────────────────────────

export interface MasjidInfo {
  id: string;
  subdomain: string;
  name: string;
  city?: string;
}

// ─── API Response Wrapper ─────────────────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

// ─── Error Response ───────────────────────────────────────────────────────────

export interface ApiError {
  error: string;
  details?: any;
}

// ─── Request Types ────────────────────────────────────────────────────────────

export interface UpdateLayoutRequest {
  layout: Layout;
  version: number;
}

// ─── Response Types ───────────────────────────────────────────────────────────

export type GetLayoutResponse = ApiResponse<BuilderContent>;

export type UpdateLayoutResponse = ApiResponse<BuilderContent>;

export type PublishLayoutResponse = ApiResponse<{ publishedAt: string } | null>;

export type GetPublicMasjidsResponse = ApiResponse<MasjidInfo[]>;

export type GetMasjidBySubdomainResponse = ApiResponse<BuilderContent>;