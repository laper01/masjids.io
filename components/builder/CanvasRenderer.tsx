// components/builder/CanvasRenderer.tsx
"use client";

import React from "react";
import { REGISTRY_MAP } from "@/components/builder/registry";
import type { CanvasNode } from "@/lib/builder/layout";

function resolveProps(props: Record<string, string | number | boolean>) {
  return Object.fromEntries(
    Object.entries(props).map(([k, v]) => [k, v === "true" ? true : v === "false" ? false : v])
  );
}

export function CanvasRenderer({ nodes }: { nodes: CanvasNode[] }) {
  return (
    <>
      {nodes.map((node) => (
        <CanvasRendererNode key={node.id} node={node} />
      ))}
    </>
  );
}

function CanvasRendererNode({ node }: { node: CanvasNode }) {
  const entry = REGISTRY_MAP[node.componentId];
  if (!entry) return null; // unknown component — skip silently on public page

  const { Component, isSlot } = entry;
  const resolvedProps = resolveProps(node.props);

  if (isSlot) {
    return (
      <Component {...resolvedProps}>
        {node.children.map((child) => (
          <CanvasRendererNode key={child.id} node={child} />
        ))}
      </Component>
    );
  }

  return <Component {...resolvedProps} />;
}