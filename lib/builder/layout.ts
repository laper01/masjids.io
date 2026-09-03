// lib/builder/layout.ts
import { REGISTRY_MAP } from "@/components/builder/registry";
import type { ComponentNode, BuilderContent } from "@/types/builder";

export interface CanvasNode {
  id: string;
  componentId: string;
  name: string;
  props: Record<string, string | number | boolean>;
  children: CanvasNode[];
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

export function componentToCanvasNode(node: ComponentNode): CanvasNode {
  const componentId = node.type;
  const entry = REGISTRY_MAP[componentId];
  return {
    id: uid(),
    componentId,
    name: entry?.name ?? componentId,
    props: { ...(entry?.defaultProps ?? {}), ...node.props },
    children: node.children.map(componentToCanvasNode),
  };
}

export function hydrateLayout(content: BuilderContent | null): CanvasNode[] | null {
  if (!content?.layout?.root) return null;
  const children = content.layout.root.children ?? [];
  if (children.length === 0) return null;
  return children.map(componentToCanvasNode);
}