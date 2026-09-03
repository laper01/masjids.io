"use client";

/**
 * BuilderPage.tsx
 *
 * Full Page Builder UI for masjids.io
 * ─────────────────────────────────────
 * Layout:  [Left Palette] [Canvas] [Right Inspector]
 *
 * Features:
 *  - Load saved layout from backend on mount
 *  - Save draft → Publish with dynamic status badge
 *  - Undo / Redo (Cmd+Z / Cmd+Shift+Z, 50 steps)
 *  - Reorder nodes with ↑ / ↓ in inspector
 *  - Copy / Paste (Cmd+C / Cmd+V)
 *  - Conflict resolution modal on 409
 *  - Autosave with 30s debounce
 *  - Component search in palette
 *  - Canvas zoom (Cmd+Scroll, 50%–200%)
 *  - Multi-select with Shift+Click and bulk delete
 *  - Drag & drop reorder with @dnd-kit/sortable
 *  - Keyboard: Delete, Cmd+S, Cmd+Z, Cmd+C/V/D
 */

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RekaProvider } from "@rekajs/react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  closestCenter,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  Monitor, Tablet, Smartphone,
  Sun, Moon,
  Undo2, Redo2,
  Eye, Upload, Save,
  Plus, Search, X,
  ChevronRight, ChevronDown,
  Trash2, Copy, Settings,
  Loader2, PanelLeft, PanelRight,
  CheckCircle2, AlertCircle,
  ArrowUp, ArrowDown,
  ZoomIn, ZoomOut,
  GitMerge, GripVertical,
} from "lucide-react";

import { createRekaState } from "@/reka/state";
import { useBuilderOperations } from "@/hooks/useBuilder";
import { useMosque } from "@/context/MosqueContext";
import {
  REGISTRY, REGISTRY_MAP, CATEGORY_ORDER,
  type RegistryEntry, type InspectorField,
} from "@/components/builder/registry";
import type { Layout, ComponentNode, BuilderContent } from "@/types/builder";

import { LayoutTemplate } from "lucide-react";                        // add to lucide import
import TemplatePicker from "@/components/builder/templates/TemplatePicker";

// ─── Types ────────────────────────────────────────────────────────────────────

type Theme = "light" | "dark";
type Viewport = "desktop" | "tablet" | "mobile";
type SaveStatus = "unsaved" | "saving" | "saved" | "autosaved" | "publishing" | "published" | "error";

export interface CanvasNode {
  id: string;
  componentId: string;
  name: string;
  props: Record<string, string | number | boolean>;
  children: CanvasNode[];
}

// ─── Utilities ────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

function uid(): string {
  return Math.random().toString(36).slice(2, 9);
}

function deepClone(n: CanvasNode): CanvasNode {
  return { ...n, id: uid(), children: n.children.map(deepClone) };
}

// ─── Serialization ────────────────────────────────────────────────────────────

function canvasNodeToComponent(node: CanvasNode): ComponentNode {
  return {
    type: node.componentId,
    props: { ...node.props },
    children: node.children.map(canvasNodeToComponent),
  };
}

function treeToLayout(nodes: CanvasNode[]): Layout {
  return {
    root: {
      type: "div",
      props: { style: { backgroundColor: "#ffffff", padding: "0px" } },
      children: nodes.map(canvasNodeToComponent),
    },
  };
}

function componentToCanvasNode(node: ComponentNode): CanvasNode {
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

function hydrateLayout(content: BuilderContent | null): CanvasNode[] | null {
  if (!content?.layout?.root) return null;
  const children = content.layout.root.children ?? [];
  if (children.length === 0) return null;
  return children.map(componentToCanvasNode);
}

// ─── Default canvas tree ──────────────────────────────────────────────────────

function makeDefaultTree(): CanvasNode[] {
  return [
    {
      id: uid(),
      componentId: "container",
      name: "Container",
      props: { className: "p-8 flex flex-col gap-6 bg-emerald-50 rounded-2xl" },
      children: [
        {
          id: uid(),
          componentId: "heading",
          name: "Heading",
          props: { text: "Welcome to Our Masjid", level: 1, preset: "bold", color: "emerald", className: "" },
          children: [],
        },
        {
          id: uid(),
          componentId: "text",
          name: "Text",
          props: { value: "We are happy to have you visit us.", className: "text-base text-slate-600" },
          children: [],
        },
        {
          id: uid(),
          componentId: "button",
          name: "Button",
          props: { label: "View Prayer Schedule", variant: "solid", color: "emerald", size: "md", shape: "rounded", fullWidth: false, disabled: false, className: "" },
          children: [],
        },
      ],
    },
  ];
}

// ─── Undo/Redo ────────────────────────────────────────────────────────────────

const MAX_HISTORY = 50;

function useHistory(initial: CanvasNode[]) {
  const [history, setHistory] = useState<CanvasNode[][]>([initial]);
  const [cursor, setCursor] = useState(0);
  const current = history[cursor];

  const push = useCallback((next: CanvasNode[]) => {
    setHistory((prev) => {
      const trimmed = prev.slice(0, cursor + 1);
      const capped = trimmed.length >= MAX_HISTORY ? trimmed.slice(1) : trimmed;
      return [...capped, next];
    });
    setCursor((c) => Math.min(c + 1, MAX_HISTORY - 1));
  }, [cursor]);

  const undo = useCallback(() => setCursor((c) => Math.max(0, c - 1)), []);
  const redo = useCallback(() => setCursor((c) => Math.min(history.length - 1, c + 1)), [history.length]);
  const reset = useCallback((nodes: CanvasNode[]) => { setHistory([nodes]); setCursor(0); }, []);

  return { tree: current, push, undo, redo, canUndo: cursor > 0, canRedo: cursor < history.length - 1, reset };
}

// ─── Status Badge ─────────────────────────────────────────────────────────────

function StatusBadge({ status, isDark }: { status: SaveStatus; isDark: boolean }) {
  const config: Record<SaveStatus, { label: string; color: string }> = {
    unsaved: { label: "Unsaved changes", color: isDark ? "text-amber-400" : "text-amber-600" },
    saving: { label: "Saving...", color: isDark ? "text-slate-400" : "text-slate-500" },
    saved: { label: "Saved · Draft", color: isDark ? "text-emerald-400" : "text-emerald-600" },
    autosaved: { label: "Autosaved", color: isDark ? "text-emerald-400" : "text-emerald-600" },
    publishing: { label: "Publishing...", color: isDark ? "text-slate-400" : "text-slate-500" },
    published: { label: "Published", color: isDark ? "text-emerald-400" : "text-emerald-600" },
    error: { label: "Error — try again", color: isDark ? "text-red-400" : "text-red-500" },
  };
  const { label, color } = config[status];
  return <p className={cn("text-[10px] mt-0.5 font-medium", color)}>{label}</p>;
}

// ─── Conflict Modal ───────────────────────────────────────────────────────────

function ConflictModal({ isDark, onKeepMine, onUseLatest, loading }: {
  isDark: boolean;
  onKeepMine: () => void;
  onUseLatest: () => void;
  loading: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 8 }}
        transition={{ duration: 0.2 }}
        className={cn("w-full max-w-md rounded-2xl shadow-2xl border p-6 mx-4", isDark ? "bg-[#13151f] border-slate-700" : "bg-white border-slate-200")}
      >
        <div className="flex items-center gap-3 mb-4">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0", isDark ? "bg-amber-900/40" : "bg-amber-50")}>
            <GitMerge size={18} className="text-amber-500" />
          </div>
          <div>
            <h2 className={cn("text-sm font-bold", isDark ? "text-slate-100" : "text-slate-800")}>Layout conflict detected</h2>
            <p className={cn("text-xs mt-0.5", isDark ? "text-slate-400" : "text-slate-500")}>
              Another admin has modified this page since you started editing.
            </p>
          </div>
        </div>
        <div className={cn("rounded-xl border divide-y text-sm mb-5", isDark ? "border-slate-700 divide-slate-700" : "border-slate-100 divide-slate-100")}>
          <div className={cn("p-3.5", isDark ? "bg-slate-800/50" : "bg-slate-50/50")}>
            <p className={cn("font-semibold text-xs mb-0.5", isDark ? "text-slate-200" : "text-slate-700")}>Keep mine</p>
            <p className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>Override the server with your changes. Their edits will be lost.</p>
          </div>
          <div className={cn("p-3.5", isDark ? "bg-slate-800/50" : "bg-slate-50/50")}>
            <p className={cn("font-semibold text-xs mb-0.5", isDark ? "text-slate-200" : "text-slate-700")}>Use latest</p>
            <p className={cn("text-[11px]", isDark ? "text-slate-400" : "text-slate-500")}>Discard your changes and load the server version.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={onUseLatest} disabled={loading}
            className={cn("flex-1 py-2 rounded-xl text-xs font-semibold transition-colors border disabled:opacity-50", isDark ? "border-slate-600 text-slate-300 hover:bg-slate-700" : "border-slate-200 text-slate-600 hover:bg-slate-50")}>
            {loading ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Use Latest"}
          </button>
          <button onClick={onKeepMine} disabled={loading}
            className="flex-1 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-600 text-white transition-colors disabled:opacity-50">
            {loading ? <Loader2 size={12} className="animate-spin mx-auto" /> : "Keep Mine"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Sortable Canvas Node ─────────────────────────────────────────────────────

/**
 * Wraps a root-level CanvasNode with dnd-kit sortable.
 * Only root nodes are sortable — nested children use ↑/↓ buttons.
 */
function SortableCanvasNode({
  node, selected, selectedIds, onSelect, isPreview,
}: {
  node: CanvasNode;
  selected: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string, shift: boolean) => void;
  isPreview: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: node.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style}>
      <CanvasNodeView
        node={node}
        selected={selected}
        selectedIds={selectedIds}
        onSelect={onSelect}
        depth={0}
        isPreview={isPreview}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

// ─── Canvas Node Renderer ─────────────────────────────────────────────────────

function CanvasNodeView({
  node, selected, selectedIds, onSelect, depth, isPreview, dragHandleProps,
}: {
  node: CanvasNode;
  selected: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string, shift: boolean) => void;
  depth: number;
  isPreview: boolean;
  dragHandleProps?: React.HTMLAttributes<HTMLElement>;
}) {
  const isSelected = !isPreview && selected === node.id;
  const isMultiSelected = !isPreview && selectedIds.size > 1 && selectedIds.has(node.id);
  const entry = REGISTRY_MAP[node.componentId];

  if (!entry) {
    return (
      <div className="text-xs text-red-400 px-2 py-1 border border-red-200 rounded-md">
        Unknown: {node.componentId}
      </div>
    );
  }

  const { Component, isSlot, name } = entry;

  const resolvedProps = Object.fromEntries(
    Object.entries(node.props).map(([k, v]) => [k, v === "true" ? true : v === "false" ? false : v])
  );

  const selectionRing = isPreview
    ? ""
    : isMultiSelected
      ? "ring-2 ring-sky-400 ring-offset-2"
      : isSelected
        ? "ring-2 ring-emerald-500 ring-offset-2"
        : "hover:ring-1 hover:ring-emerald-300 hover:ring-offset-1";

  const label = (isSelected || isMultiSelected) && !isPreview && (
    <div className={cn(
      "absolute -top-6 left-0 text-white text-[10px] font-bold px-2 py-0.5 rounded-t-md z-10 flex items-center gap-1.5",
      isMultiSelected ? "bg-sky-500" : "bg-emerald-600"
    )}>
      {/* Drag handle — only on root nodes (depth 0) */}
      {depth === 0 && dragHandleProps && (
        <span {...dragHandleProps} className="cursor-grab active:cursor-grabbing opacity-70 hover:opacity-100">
          <GripVertical size={10} />
        </span>
      )}
      {name}
    </div>
  );

  const handleClick = isPreview
    ? undefined
    : (e: React.MouseEvent) => { e.stopPropagation(); onSelect(node.id, e.shiftKey); };

  if (isSlot) {
    return (
      <motion.div layout onClick={handleClick} style={{ position: "relative" }}
        className={cn("rounded-xl transition-all duration-150", selectionRing)}>
        {label}
        <Component {...resolvedProps}>
          {node.children.length === 0 && !isPreview ? (
            <p className="text-xs text-slate-300 italic flex items-center gap-1">
              <Plus size={10} /> Drop components here
            </p>
          ) : (
            node.children.map((child) => (
              <CanvasNodeView
                key={child.id}
                node={child}
                selected={selected}
                selectedIds={selectedIds}
                onSelect={onSelect}
                depth={depth + 1}
                isPreview={isPreview}
              />
            ))
          )}
        </Component>
      </motion.div>
    );
  }

  return (
    <motion.div layout onClick={handleClick} style={{ position: "relative" }}
      className={cn("rounded-lg transition-all duration-150 p-1", selectionRing)}>
      {label}
      <Component {...resolvedProps} />
    </motion.div>
  );
}

// ─── Layer Tree Item ──────────────────────────────────────────────────────────

function LayerItem({ node, selected, selectedIds, onSelect, depth }: {
  node: CanvasNode;
  selected: string | null;
  selectedIds: Set<string>;
  onSelect: (id: string, shift: boolean) => void;
  depth: number;
}) {
  const [open, setOpen] = useState(true);
  const hasChildren = node.children.length > 0;
  const isSelected = selected === node.id;
  const isMultiSelected = selectedIds.size > 1 && selectedIds.has(node.id);
  const entry = REGISTRY_MAP[node.componentId];

  return (
    <div>
      <div
        onClick={(e) => onSelect(node.id, e.shiftKey)}
        className={cn(
          "flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer text-xs transition-colors select-none",
          isMultiSelected
            ? "bg-sky-50 text-sky-800 font-semibold"
            : isSelected
              ? "bg-emerald-50 text-emerald-800 font-semibold"
              : "text-slate-500 hover:bg-slate-100 hover:text-slate-700"
        )}
        style={{ paddingLeft: `${8 + depth * 14}px` }}
      >
        {hasChildren ? (
          <button onClick={(e) => { e.stopPropagation(); setOpen((v) => !v); }} className="text-slate-400 hover:text-slate-600 flex-shrink-0">
            {open ? <ChevronDown size={11} /> : <ChevronRight size={11} />}
          </button>
        ) : <span className="w-3 flex-shrink-0" />}
        <span className={cn("flex-shrink-0", isSelected || isMultiSelected ? "text-emerald-600" : "text-slate-400")}>
          {entry?.icon}
        </span>
        <span className="truncate">{node.name}</span>
      </div>
      <AnimatePresence>
        {open && hasChildren && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.18 }}>
            {node.children.map((child) => (
              <LayerItem key={child.id} node={child} selected={selected} selectedIds={selectedIds} onSelect={onSelect} depth={depth + 1} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Inspector Field ──────────────────────────────────────────────────────────

function InspectorFieldRow({ field, value, onChange }: {
  field: InspectorField;
  value: string | number | boolean;
  onChange: (v: string) => void;
}) {
  const strVal = String(value ?? "");
  return (
    <div className="flex items-center gap-2 py-1.5">
      <span className="text-[11px] text-slate-400 font-medium w-24 flex-shrink-0 capitalize">{field.label}</span>
      {field.type === "color" ? (
        <div className="flex items-center gap-1.5 flex-1">
          <input type="color" value={strVal} onChange={(e) => onChange(e.target.value)} className="w-7 h-7 rounded-md border border-slate-200 cursor-pointer p-0.5" />
          <input type="text" value={strVal} onChange={(e) => onChange(e.target.value)} className="flex-1 text-xs px-2 py-1 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 font-mono" />
        </div>
      ) : field.type === "select" ? (
        <select value={strVal} onChange={(e) => onChange(e.target.value)} className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400 appearance-none">
          {field.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : (
        <input type={field.type} value={strVal} onChange={(e) => onChange(e.target.value)} className="flex-1 text-xs px-2 py-1.5 bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-400" />
      )}
    </div>
  );
}

// ─── Inspector Panel ──────────────────────────────────────────────────────────

function InspectorPanel({ node, selectedIds, onUpdateProp, onDelete, onDuplicate, onMoveUp, onMoveDown, onBulkDelete, canMoveUp, canMoveDown, theme }: {
  node: CanvasNode | null;
  selectedIds: Set<string>;
  onUpdateProp: (id: string, key: string, value: string) => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onMoveUp: (id: string) => void;
  onMoveDown: (id: string) => void;
  onBulkDelete: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  theme: Theme;
}) {
  const isDark = theme === "dark";

  // Multi-select state — show bulk panel
  if (selectedIds.size > 1) {
    return (
      <div className="flex flex-col h-full">
        <div className={cn("px-4 py-3 border-b flex items-center justify-between flex-shrink-0", isDark ? "border-slate-700" : "border-slate-100")}>
          <div className="flex items-center gap-2">
            <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", isDark ? "bg-sky-900 text-sky-400" : "bg-sky-50 text-sky-600")}>
              <Copy size={12} />
            </div>
            <span className={cn("text-sm font-semibold", isDark ? "text-slate-100" : "text-slate-800")}>
              {selectedIds.size} selected
            </span>
          </div>
          <button onClick={onBulkDelete} className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-slate-400 hover:text-red-500" title="Delete all selected">
            <Trash2 size={12} />
          </button>
        </div>
        <div className="flex flex-col items-center justify-center flex-1 gap-3 px-6 text-center">
          <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-500")}>
            {selectedIds.size} components selected.
            Press <kbd className={cn("px-1.5 py-0.5 rounded text-[10px] font-mono", isDark ? "bg-slate-700 text-slate-300" : "bg-slate-100 text-slate-600")}>Delete</kbd> to remove all,
            or click a single component to inspect it.
          </p>
        </div>
      </div>
    );
  }

  if (!node) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400 px-6">
        <div className={cn("w-12 h-12 rounded-xl flex items-center justify-center", isDark ? "bg-slate-800" : "bg-slate-100")}>
          <Settings size={20} className="text-slate-400" />
        </div>
        <p className="text-xs text-center leading-relaxed">Click any component on the canvas to inspect and edit its properties</p>
      </div>
    );
  }

  const entry = REGISTRY_MAP[node.componentId];
  if (!entry) return null;

  return (
    <div className="flex flex-col h-full">
      <div className={cn("px-4 py-3 border-b flex items-center justify-between flex-shrink-0", isDark ? "border-slate-700" : "border-slate-100")}>
        <div className="flex items-center gap-2">
          <div className={cn("w-6 h-6 rounded-md flex items-center justify-center", isDark ? "bg-emerald-900 text-emerald-400" : "bg-emerald-50 text-emerald-600")}>
            {entry.icon}
          </div>
          <span className={cn("text-sm font-semibold", isDark ? "text-slate-100" : "text-slate-800")}>{node.name}</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => onMoveUp(node.id)} disabled={!canMoveUp} title="Move up"
            className={cn("p-1.5 rounded-lg transition-colors disabled:opacity-30", isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
            <ArrowUp size={12} />
          </button>
          <button onClick={() => onMoveDown(node.id)} disabled={!canMoveDown} title="Move down"
            className={cn("p-1.5 rounded-lg transition-colors disabled:opacity-30", isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
            <ArrowDown size={12} />
          </button>
          <button onClick={() => onDuplicate(node.id)} title="Duplicate (Cmd+D)"
            className={cn("p-1.5 rounded-lg transition-colors", isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500")}>
            <Copy size={12} />
          </button>
          <button onClick={() => onDelete(node.id)} title="Delete"
            className="p-1.5 rounded-lg transition-colors hover:bg-red-50 text-slate-400 hover:text-red-500">
            <Trash2 size={12} />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2">
        <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2 mt-1", isDark ? "text-slate-500" : "text-slate-400")}>Properties</p>
        {entry.fields.map((field) => (
          <InspectorFieldRow
            key={field.key}
            field={field}
            value={node.props[field.key] ?? entry.defaultProps[field.key] ?? ""}
            onChange={(v) => onUpdateProp(node.id, field.key, v)}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Zoom ─────────────────────────────────────────────────────────────────────

const ZOOM_MIN = 0.5, ZOOM_MAX = 2, ZOOM_STEP = 0.1;
const clampZoom = (v: number) => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, parseFloat(v.toFixed(1))));

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function BuilderPage() {
  const { activeMosque } = useMosque();
  const masjidId = activeMosque?.id ?? "";
  const rekaInstance = useMemo(() => createRekaState(), []);

  const [showTemplatePicker, setShowTemplatePicker] = useState(false);

  const { content, loading: hookLoading, updateContent, publishContent, fetchContent } =
    useBuilderOperations(masjidId);

  const { tree, push, undo, redo, canUndo, canRedo, reset } = useHistory(makeDefaultTree());

  // Hydrate from backend on first load
  const hydratedRef = useRef(false);
  useEffect(() => {
    if (hydratedRef.current || hookLoading || !content) return;
    const nodes = hydrateLayout(content);
    if (nodes) { reset(nodes); setSaveStatus("saved"); }
    hydratedRef.current = true;
  }, [content, hookLoading, reset]);

  // ── UI state ────────────────────────────────────────────────────────────────
  const [theme, setTheme] = useState<Theme>("light");
  const [viewport, setViewport] = useState<Viewport>("desktop");

  // ── Selection — single + multi ───────────────────────────────────────────────
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [leftTab, setLeftTab] = useState<"components" | "layers">("components");
  const [leftOpen, setLeftOpen] = useState(true);
  const [rightOpen, setRightOpen] = useState(true);
  const [isPreview, setIsPreview] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("unsaved");
  const [actionLoading, setActionLoading] = useState<"save" | "publish" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [zoom, setZoom] = useState(1);
  const [showConflict, setShowConflict] = useState(false);
  const [conflictLoading, setConflictLoading] = useState(false);
  const [clipboard, setClipboard] = useState<CanvasNode | null>(null);

  // ── Drag state ───────────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null);
  const activeNode = activeId ? tree.find((n) => n.id === activeId) ?? null : null;

  const pendingLayoutRef = useRef<Layout | null>(null);
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const isDark = theme === "dark";

  // ── dnd-kit sensors ──────────────────────────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  // ── Helpers ─────────────────────────────────────────────────────────────────

  const findNode = useCallback((nodes: CanvasNode[], id: string): CanvasNode | null => {
    for (const n of nodes) {
      if (n.id === id) return n;
      const found = findNode(n.children, id);
      if (found) return found;
    }
    return null;
  }, []);

  const selectedNode = selectedId ? findNode(tree, selectedId) : null;

  const findSiblings = useCallback((nodes: CanvasNode[], id: string): { siblings: CanvasNode[]; index: number } | null => {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i].id === id) return { siblings: nodes, index: i };
      const found = findSiblings(nodes[i].children, id);
      if (found) return found;
    }
    return null;
  }, []);

  const markUnsaved = useCallback(() => {
    setSaveStatus((prev) => ["published", "saved", "autosaved"].includes(prev) ? "unsaved" : prev);
  }, []);

  /**
   * Unified select handler.
   * Shift+Click → toggle node in/out of multi-selection.
   * Plain click → single select, clear multi.
   */
  const handleSelect = useCallback((id: string, shift: boolean) => {
    if (shift) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        if (next.has(id)) { next.delete(id); } else { next.add(id); }
        // Keep primary selected in sync with first item
        return next;
      });
      setSelectedId(id);
    } else {
      setSelectedId(id);
      setSelectedIds(new Set([id]));
    }
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedId(null);
    setSelectedIds(new Set());
  }, []);

  // ── Canvas mutations ─────────────────────────────────────────────────────────

  const addComponent = useCallback((entry: RegistryEntry) => {
    const newNode: CanvasNode = { id: uid(), componentId: entry.id, name: entry.name, props: { ...entry.defaultProps }, children: [] };
    const next = (() => {
      const tryInsert = (nodes: CanvasNode[]): CanvasNode[] =>
        nodes.map((n) => {
          if (n.id === selectedId && REGISTRY_MAP[n.componentId]?.isSlot) return { ...n, children: [...n.children, newNode] };
          return { ...n, children: tryInsert(n.children) };
        });
      const inserted = tryInsert(tree);
      return JSON.stringify(inserted) !== JSON.stringify(tree) ? inserted : [...tree, newNode];
    })();
    push(next);
    setSelectedId(newNode.id);
    setSelectedIds(new Set([newNode.id]));
    markUnsaved();
  }, [tree, selectedId, push, markUnsaved]);

  const updateProp = useCallback((id: string, key: string, value: string) => {
    const update = (nodes: CanvasNode[]): CanvasNode[] =>
      nodes.map((n) => n.id === id ? { ...n, props: { ...n.props, [key]: value } } : { ...n, children: update(n.children) });
    push(update(tree));
    markUnsaved();
  }, [tree, push, markUnsaved]);

  const deleteNode = useCallback((id: string) => {
    const remove = (nodes: CanvasNode[]): CanvasNode[] =>
      nodes.filter((n) => n.id !== id).map((n) => ({ ...n, children: remove(n.children) }));
    push(remove(tree));
    clearSelection();
    markUnsaved();
  }, [tree, push, clearSelection, markUnsaved]);

  /** Delete all nodes in selectedIds */
  const bulkDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    const ids = selectedIds;
    const remove = (nodes: CanvasNode[]): CanvasNode[] =>
      nodes.filter((n) => !ids.has(n.id)).map((n) => ({ ...n, children: remove(n.children) }));
    push(remove(tree));
    clearSelection();
    markUnsaved();
  }, [tree, selectedIds, push, clearSelection, markUnsaved]);

  const duplicateNode = useCallback((id: string) => {
    const dup = (nodes: CanvasNode[]): CanvasNode[] => {
      const result: CanvasNode[] = [];
      for (const n of nodes) {
        result.push({ ...n, children: dup(n.children) });
        if (n.id === id) result.push(deepClone(n));
      }
      return result;
    };
    push(dup(tree));
    markUnsaved();
  }, [tree, push, markUnsaved]);

  const moveNode = useCallback((id: string, direction: "up" | "down") => {
    const move = (nodes: CanvasNode[]): CanvasNode[] => {
      const idx = nodes.findIndex((n) => n.id === id);
      if (idx !== -1) {
        const next = [...nodes];
        const swap = direction === "up" ? idx - 1 : idx + 1;
        if (swap < 0 || swap >= next.length) return nodes;
        [next[idx], next[swap]] = [next[swap], next[idx]];
        return next;
      }
      return nodes.map((n) => ({ ...n, children: move(n.children) }));
    };
    push(move(tree));
    markUnsaved();
  }, [tree, push, markUnsaved]);

  const copyNode = useCallback(() => {
    if (!selectedNode) return;
    setClipboard(deepClone(selectedNode));
  }, [selectedNode]);

  const pasteNode = useCallback(() => {
    if (!clipboard) return;
    const pasted = deepClone(clipboard);
    const next = (() => {
      if (selectedId) {
        const trySlot = (nodes: CanvasNode[]): CanvasNode[] =>
          nodes.map((n) => {
            if (n.id === selectedId && REGISTRY_MAP[n.componentId]?.isSlot) return { ...n, children: [...n.children, pasted] };
            return { ...n, children: trySlot(n.children) };
          });
        const slotResult = trySlot(tree);
        if (JSON.stringify(slotResult) !== JSON.stringify(tree)) return slotResult;
        const pasteAfter = (nodes: CanvasNode[]): CanvasNode[] => {
          const result: CanvasNode[] = [];
          for (const n of nodes) {
            result.push({ ...n, children: pasteAfter(n.children) });
            if (n.id === selectedId) result.push(pasted);
          }
          return result;
        };
        return pasteAfter(tree);
      }
      return [...tree, pasted];
    })();
    push(next);
    setSelectedId(pasted.id);
    setSelectedIds(new Set([pasted.id]));
    markUnsaved();
  }, [clipboard, selectedId, tree, push, markUnsaved]);

  const { canMoveUp, canMoveDown } = useMemo(() => {
    if (!selectedId) return { canMoveUp: false, canMoveDown: false };
    const result = findSiblings(tree, selectedId);
    if (!result) return { canMoveUp: false, canMoveDown: false };
    return { canMoveUp: result.index > 0, canMoveDown: result.index < result.siblings.length - 1 };
  }, [selectedId, tree, findSiblings]);

  // ── Drag & Drop ──────────────────────────────────────────────────────────────

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  }, []);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIndex = tree.findIndex((n) => n.id === active.id);
    const newIndex = tree.findIndex((n) => n.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;
    push(arrayMove(tree, oldIndex, newIndex));
    markUnsaved();
  }, [tree, push, markUnsaved]);

  // ── Save / Publish ───────────────────────────────────────────────────────────

  const isBusy = actionLoading !== null || hookLoading;

  const attemptSave = useCallback(async (layout: Layout): Promise<boolean> => {
    try {
      await updateContent(layout);
      return true;
    } catch (err: any) {
      const msg = err?.message?.toLowerCase() ?? "";
      if (msg.includes("409") || msg.includes("conflict")) return false;
      throw err;
    }
  }, [updateContent]);

  const handleSave = useCallback(async (isAuto = false) => {
    if (isBusy) return;
    const layout = treeToLayout(tree);
    try {
      setActionLoading("save");
      setSaveStatus("saving");
      const ok = await attemptSave(layout);
      if (ok) { setSaveStatus(isAuto ? "autosaved" : "saved"); }
      else { pendingLayoutRef.current = layout; setShowConflict(true); setSaveStatus("error"); }
    } catch { setSaveStatus("error"); }
    finally { setActionLoading(null); }
  }, [tree, attemptSave, isBusy]);

  const handlePublish = useCallback(async () => {
    if (isBusy) return;
    const layout = treeToLayout(tree);
    try {
      setActionLoading("publish");
      setSaveStatus("publishing");
      const ok = await attemptSave(layout);
      if (!ok) { pendingLayoutRef.current = layout; setShowConflict(true); setSaveStatus("error"); return; }
      await publishContent();
      setSaveStatus("published");
    } catch { setSaveStatus("error"); }
    finally { setActionLoading(null); }
  }, [tree, attemptSave, publishContent, isBusy]);

  const handleKeepMine = useCallback(async () => {
    if (!pendingLayoutRef.current) return;
    setConflictLoading(true);
    try {
      await fetchContent();
      await updateContent(pendingLayoutRef.current);
      setSaveStatus("saved");
      setShowConflict(false);
    } catch { setSaveStatus("error"); }
    finally { setConflictLoading(false); pendingLayoutRef.current = null; }
  }, [fetchContent, updateContent]);

  const handleUseLatest = useCallback(async () => {
    setConflictLoading(true);
    try {
      await fetchContent();
      hydratedRef.current = false;
      setSaveStatus("saved");
      setShowConflict(false);
    } catch { setSaveStatus("error"); }
    finally { setConflictLoading(false); pendingLayoutRef.current = null; }
  }, [fetchContent]);

  // ── Autosave ─────────────────────────────────────────────────────────────────

  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (saveStatus !== "unsaved" || isBusy || !hydratedRef.current) return;
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current);
    autosaveTimerRef.current = setTimeout(() => { handleSave(true); }, 30_000);
    return () => { if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current); };
  }, [tree, saveStatus, isBusy, handleSave]);

  // ── Zoom — Cmd+Scroll ────────────────────────────────────────────────────────

  useEffect(() => {
    const el = canvasWrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      if (!(isMac ? e.metaKey : e.ctrlKey)) return;
      e.preventDefault();
      setZoom((z) => clampZoom(z + (e.deltaY < 0 ? ZOOM_STEP : -ZOOM_STEP)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  // ── Keyboard shortcuts ───────────────────────────────────────────────────────

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().includes("MAC");
      const mod = isMac ? e.metaKey : e.ctrlKey;
      const tag = (e.target as HTMLElement).tagName;
      const inInput = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (mod && !e.shiftKey && e.key === "z") { e.preventDefault(); undo(); markUnsaved(); return; }
      if (mod && e.shiftKey && e.key === "z") { e.preventDefault(); redo(); markUnsaved(); return; }
      if (mod && e.key === "s") { e.preventDefault(); handleSave(); return; }
      if (mod && e.key === "=") { e.preventDefault(); setZoom((z) => clampZoom(z + ZOOM_STEP)); return; }
      if (mod && e.key === "-") { e.preventDefault(); setZoom((z) => clampZoom(z - ZOOM_STEP)); return; }
      if (mod && e.key === "0") { e.preventDefault(); setZoom(1); return; }
      if (mod && e.key === "c" && !inInput) { e.preventDefault(); copyNode(); return; }
      if (mod && e.key === "v" && !inInput) { e.preventDefault(); pasteNode(); return; }
      if (mod && e.key === "d" && !inInput && selectedId) { e.preventDefault(); duplicateNode(selectedId); return; }
      if ((e.key === "Delete" || e.key === "Backspace") && !inInput) {
        if (selectedIds.size > 1) { e.preventDefault(); bulkDelete(); return; }
        if (selectedId) { e.preventDefault(); deleteNode(selectedId); }
      }
      if (e.key === "Escape") { clearSelection(); }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [undo, redo, handleSave, selectedId, selectedIds, deleteNode, bulkDelete, copyNode, pasteNode, duplicateNode, markUnsaved, clearSelection]);

  // ── Filtered registry ────────────────────────────────────────────────────────

  const filteredRegistry = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    return REGISTRY.filter((e) => e.name.toLowerCase().includes(q) || e.category.toLowerCase().includes(q));
  }, [searchQuery]);

  // ── Theme tokens ─────────────────────────────────────────────────────────────

  const bg = isDark ? "bg-[#0f1117]" : "bg-[#f1f3f6]";
  const border = isDark ? "border-slate-700/60" : "border-slate-200/80";
  const text = isDark ? "text-slate-100" : "text-[#131b2e]";
  const textMuted = isDark ? "text-slate-400" : "text-slate-500";
  const panelBg = isDark ? "bg-[#13151f]" : "bg-white";

  const viewportWidth = { desktop: "100%", tablet: "768px", mobile: "390px" }[viewport];

  const autoPickerShownRef = useRef(false);
  useEffect(() => {
    if (autoPickerShownRef.current) return;
    if (hookLoading) return;
    // Wait a tick after hydration
    if (!hydratedRef.current && !content) {
      // Backend returned nothing — show picker
      autoPickerShownRef.current = true;
      setShowTemplatePicker(true);
    }
  }, [hookLoading, content]);


  useEffect(() => {
    if (autoPickerShownRef.current) return;
    if (!hydratedRef.current) return;
    if (tree.length === 0) {
      autoPickerShownRef.current = true;
      setShowTemplatePicker(true);
    }
  }, [hydratedRef.current, tree.length]);

  // Template apply handler

  const applyTemplate = useCallback((nodes: CanvasNode[]) => {
    reset(nodes);
    clearSelection();
    // Blank template → keep unsaved, everything else → mark unsaved
    setSaveStatus("unsaved");
  }, [reset, clearSelection]);



  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <RekaProvider reka={rekaInstance}>
      <div className={cn("flex flex-col h-screen overflow-hidden", isDark ? "bg-[#0f1117]" : "bg-[#f1f3f6]")}>

        <AnimatePresence>
          <TemplatePicker
            open={showTemplatePicker}
            onClose={() => setShowTemplatePicker(false)}
            onSelect={applyTemplate}
            isDark={isDark}
          />
          {showConflict && (
            <ConflictModal isDark={isDark} loading={conflictLoading} onKeepMine={handleKeepMine} onUseLatest={handleUseLatest} />
          )}
        </AnimatePresence>

        {/* ── Topbar ── */}
        <header className={cn("flex items-center px-4 border-b flex-shrink-0 gap-3 z-10", panelBg, border)} style={{ height: 52 }}>
          <button
            onClick={() => setShowTemplatePicker(true)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
              isDark
                ? "bg-slate-700 text-slate-200 hover:bg-slate-600"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
            title="Choose a template"
          >
            <LayoutTemplate size={13} />
            Templates
          </button>
          <button onClick={() => setLeftOpen((v) => !v)}
            className={cn("p-2 rounded-lg transition-colors", leftOpen ? (isDark ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700") : cn(textMuted, "hover:bg-slate-100"))}>
            <PanelLeft size={15} />
          </button>

          <div className={cn("w-px h-5", isDark ? "bg-slate-700" : "bg-slate-200")} />

          <div className="flex items-center gap-1">
            <button onClick={() => { undo(); markUnsaved(); }} disabled={!canUndo}
              className={cn("p-2 rounded-lg transition-colors disabled:opacity-30", textMuted, "hover:bg-slate-100")} title="Undo (Cmd+Z)">
              <Undo2 size={14} />
            </button>
            <button onClick={() => { redo(); markUnsaved(); }} disabled={!canRedo}
              className={cn("p-2 rounded-lg transition-colors disabled:opacity-30", textMuted, "hover:bg-slate-100")} title="Redo (Cmd+Shift+Z)">
              <Redo2 size={14} />
            </button>
          </div>

          <div className={cn("w-px h-5", isDark ? "bg-slate-700" : "bg-slate-200")} />

          <div className={cn("flex items-center gap-0.5 p-0.5 rounded-lg", isDark ? "bg-slate-800" : "bg-slate-100")}>
            {([{ id: "desktop", Icon: Monitor }, { id: "tablet", Icon: Tablet }, { id: "mobile", Icon: Smartphone }] as const).map(({ id, Icon }) => (
              <button key={id} onClick={() => setViewport(id)}
                className={cn("p-1.5 rounded-md transition-colors", viewport === id ? (isDark ? "bg-slate-600 text-white" : "bg-white text-slate-800 shadow-sm") : textMuted)}>
                <Icon size={13} />
              </button>
            ))}
          </div>

          <div className={cn("w-px h-5", isDark ? "bg-slate-700" : "bg-slate-200")} />

          <div className="flex items-center gap-1">
            <button onClick={() => setZoom((z) => clampZoom(z - ZOOM_STEP))} disabled={zoom <= ZOOM_MIN}
              className={cn("p-1.5 rounded-lg transition-colors disabled:opacity-30", textMuted, "hover:bg-slate-100")} title="Zoom out">
              <ZoomOut size={13} />
            </button>
            <button onClick={() => setZoom(1)}
              className={cn("text-[11px] font-mono font-semibold px-1.5 rounded-md transition-colors min-w-[40px] text-center", textMuted, "hover:bg-slate-100")} title="Reset zoom (Cmd+0)">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={() => setZoom((z) => clampZoom(z + ZOOM_STEP))} disabled={zoom >= ZOOM_MAX}
              className={cn("p-1.5 rounded-lg transition-colors disabled:opacity-30", textMuted, "hover:bg-slate-100")} title="Zoom in">
              <ZoomIn size={13} />
            </button>
          </div>

          <div className="flex-1 flex justify-center">
            <div className="text-center">
              <p className={cn("text-sm font-semibold leading-none", text)}>{activeMosque?.name ?? "Page Builder"}</p>
              <StatusBadge status={saveStatus} isDark={isDark} />
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Multi-select badge */}
            {selectedIds.size > 1 && (
              <div className={cn("flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border", isDark ? "bg-sky-900/40 border-sky-700 text-sky-300" : "bg-sky-50 border-sky-200 text-sky-700")}>
                <Copy size={10} /> {selectedIds.size} selected
              </div>
            )}

            {clipboard && (
              <div className={cn("flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium border", isDark ? "bg-slate-800 border-slate-700 text-slate-400" : "bg-slate-50 border-slate-200 text-slate-500")}>
                <Copy size={10} /> {clipboard.name} copied
              </div>
            )}

            <button onClick={() => setTheme((t) => t === "light" ? "dark" : "light")}
              className={cn("p-2 rounded-lg transition-colors", textMuted, isDark ? "hover:bg-slate-700" : "hover:bg-slate-100")}>
              {isDark ? <Sun size={14} /> : <Moon size={14} />}
            </button>

            <button onClick={() => { setIsPreview((v) => !v); clearSelection(); }}
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors",
                isPreview ? "bg-emerald-600 text-white" : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              <Eye size={13} /> {isPreview ? "Exit Preview" : "Preview"}
            </button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => handleSave()}
              disabled={isBusy || ["saved", "autosaved", "published"].includes(saveStatus)}
              title="Save draft (Cmd+S)"
              className={cn("flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors disabled:opacity-40",
                saveStatus === "error" ? "bg-red-50 text-red-600 border border-red-200 hover:bg-red-100" : isDark ? "bg-slate-700 text-slate-200 hover:bg-slate-600" : "bg-slate-100 text-slate-600 hover:bg-slate-200")}>
              {actionLoading === "save" ? <Loader2 size={12} className="animate-spin" />
                : ["saved", "autosaved", "published"].includes(saveStatus) ? <CheckCircle2 size={12} className="text-emerald-500" />
                  : saveStatus === "error" ? <AlertCircle size={12} />
                    : <Save size={12} />}
              Save
            </motion.button>

            <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={handlePublish} disabled={isBusy}
              className="flex items-center gap-1.5 px-4 py-1.5 bg-[#064e3b] hover:bg-[#043d2f] text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50">
              {actionLoading === "publish" ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
              Publish
            </motion.button>
          </div>

          <div className={cn("w-px h-5", isDark ? "bg-slate-700" : "bg-slate-200")} />

          <button onClick={() => setRightOpen((v) => !v)}
            className={cn("p-2 rounded-lg transition-colors", rightOpen ? (isDark ? "bg-slate-700 text-slate-200" : "bg-slate-100 text-slate-700") : cn(textMuted, "hover:bg-slate-100"))}>
            <PanelRight size={15} />
          </button>
        </header>

        {/* ── Body ── */}
        <div className="flex flex-1 overflow-hidden">

          {/* ── Left Panel ── */}
          <AnimatePresence initial={false}>
            {leftOpen && !isPreview && (
              <motion.aside key="left"
                initial={{ width: 0, opacity: 0 }} animate={{ width: 240, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn("flex-shrink-0 border-r flex flex-col overflow-hidden", panelBg, border)}>

                <div className={cn("flex border-b flex-shrink-0", border)}>
                  {(["components", "layers"] as const).map((tab) => (
                    <button key={tab} onClick={() => setLeftTab(tab)}
                      className={cn("flex-1 py-2.5 text-[11px] font-bold uppercase tracking-widest transition-colors",
                        leftTab === tab ? (isDark ? "text-emerald-400 border-b-2 border-emerald-400" : "text-emerald-700 border-b-2 border-emerald-600") : textMuted)}>
                      {tab}
                    </button>
                  ))}
                </div>

                {leftTab === "components" && (
                  <div className={cn("px-3 py-2 border-b flex-shrink-0", border)}>
                    <div className={cn("flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs", isDark ? "bg-slate-800 border border-slate-700" : "bg-slate-50 border border-slate-200")}>
                      <Search size={11} className={textMuted} />
                      <input type="text" placeholder="Search components..." value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className={cn("flex-1 bg-transparent outline-none text-xs placeholder:text-slate-400", isDark ? "text-slate-200" : "text-slate-700")} />
                      {searchQuery && <button onClick={() => setSearchQuery("")} className={textMuted}><X size={10} /></button>}
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-3">
                  {leftTab === "components" ? (
                    filteredRegistry ? (
                      filteredRegistry.length === 0 ? (
                        <div className="flex flex-col items-center gap-2 pt-8 text-center">
                          <Search size={18} className={textMuted} />
                          <p className={cn("text-xs", textMuted)}>No components found</p>
                        </div>
                      ) : (
                        <div>
                          <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2 px-1", textMuted)}>
                            {filteredRegistry.length} result{filteredRegistry.length !== 1 ? "s" : ""}
                          </p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {filteredRegistry.map((entry) => (
                              <motion.button key={entry.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                onClick={() => addComponent(entry)}
                                className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl text-[11px] font-semibold transition-colors border",
                                  isDark ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-emerald-700 hover:text-emerald-400"
                                    : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700")}>
                                <span className={isDark ? "text-slate-400" : "text-slate-500"}>{entry.icon}</span>
                                {entry.name}
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      )
                    ) : (
                      CATEGORY_ORDER.map((cat) => {
                        const entries = REGISTRY.filter((e) => e.category === cat);
                        if (entries.length === 0) return null;
                        return (
                          <div key={cat} className="mb-4">
                            <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2 px-1", textMuted)}>{cat}</p>
                            <div className="grid grid-cols-2 gap-1.5">
                              {entries.map((entry) => (
                                <motion.button key={entry.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                                  onClick={() => addComponent(entry)}
                                  className={cn("flex flex-col items-center gap-1.5 p-3 rounded-xl text-[11px] font-semibold transition-colors border",
                                    isDark ? "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700 hover:border-emerald-700 hover:text-emerald-400"
                                      : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700")}>
                                  <span className={isDark ? "text-slate-400" : "text-slate-500"}>{entry.icon}</span>
                                  {entry.name}
                                </motion.button>
                              ))}
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    <div>
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest mb-2 px-1", textMuted)}>Layer tree</p>
                      {tree.length === 0 ? (
                        <p className={cn("text-xs px-1", textMuted)}>No components yet.</p>
                      ) : (
                        tree.map((node) => (
                          <LayerItem key={node.id} node={node} selected={selectedId} selectedIds={selectedIds} onSelect={handleSelect} depth={0} />
                        ))
                      )}
                    </div>
                  )}
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

          {/* ── Canvas ── */}
          <main ref={canvasWrapRef}
            className={cn("flex-1 overflow-auto flex flex-col items-center py-8 px-6", bg)}
            onClick={clearSelection}>

            <div style={{
              transform: `scale(${zoom})`,
              transformOrigin: "top center",
              width: viewportWidth === "100%" ? "100%" : viewportWidth,
              maxWidth: "100%",
              marginBottom: `${(zoom - 1) * 100}%`,
            }}>
              <motion.div layout
                className={cn("relative rounded-2xl shadow-2xl transition-all duration-300 w-full", isDark ? "shadow-black/40" : "shadow-slate-300/50")}
                style={{ background: isDark ? "#1a1d27" : "#ffffff" }}>

                {!isPreview && (
                  <div className={cn("flex items-center gap-1.5 px-4 py-3 border-b flex-shrink-0 rounded-t-2xl overflow-hidden", isDark ? "bg-[#13151f] border-slate-700" : "bg-slate-50 border-slate-200")}>
                    <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    {/* replace with subdomain  */}
                    {/* <div className={cn("flex-1 mx-4 text-[11px] px-3 py-1 rounded-md text-center", isDark ? "bg-slate-800 text-slate-500" : "bg-slate-100 text-slate-400")}>
                      {activeMosque?.name ? `${activeMosque.name.toLowerCase().replace(/\s+/g, "-")}.masjids.io` : "masjid.masjids.io"}
                    </div> */}
                  </div>
                )}

                <div className="p-8" onClick={(e) => { e.stopPropagation(); if (!isPreview) clearSelection(); }}>
                  {hookLoading && !hydratedRef.current ? (
                    <div className="flex items-center justify-center h-80 gap-3 text-slate-400">
                      <Loader2 size={20} className="animate-spin" />
                      <span className="text-sm">Loading layout...</span>
                    </div>
                  ) : tree.length === 0 ? (
                    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      className={cn("flex flex-col items-center justify-center h-80 rounded-2xl border-2 border-dashed gap-4 cursor-pointer transition-colors",
                        isDark ? "border-slate-700 text-slate-600 hover:border-slate-600" : "border-slate-200 text-slate-400 hover:border-emerald-300")}
                      onClick={() => setShowTemplatePicker(true)}>
                            <LayoutTemplate size={24} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center", isDark ? "bg-slate-800" : "bg-slate-100")}>
                        <Plus size={24} className={isDark ? "text-slate-500" : "text-slate-400"} />
                      </div>
                      <div className="text-center">
                        <p className={cn("text-sm font-semibold mb-1", isDark ? "text-slate-400" : "text-slate-500")}>Canvas is empty</p>
                        <p className="text-xs">Click a component from the left panel to add it</p>
                      </div>
                    </motion.div>
                  ) : (
                    // DndContext wraps only the sortable root nodes
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    >
                      <SortableContext items={tree.map((n) => n.id)} strategy={verticalListSortingStrategy}>
                        <div className="flex flex-col gap-4 pb-16">
                          {tree.map((node) => (
                            <SortableCanvasNode
                              key={node.id}
                              node={node}
                              selected={selectedId}
                              selectedIds={selectedIds}
                              onSelect={handleSelect}
                              isPreview={isPreview}
                            />
                          ))}
                        </div>
                      </SortableContext>

                      {/* Drag overlay — ghost of the dragged node */}
                      <DragOverlay>
                        {activeNode && (
                          <div className="opacity-90 shadow-2xl rounded-xl pointer-events-none">
                            <CanvasNodeView
                              node={activeNode}
                              selected={null}
                              selectedIds={new Set()}
                              onSelect={() => { }}
                              depth={0}
                              isPreview={true}
                            />
                          </div>
                        )}
                      </DragOverlay>
                    </DndContext>
                  )}
                </div>
              </motion.div>
            </div>

            {!isPreview && (
              <p className={cn("text-[11px] mt-4 mb-8 font-medium", textMuted)}>
                {viewport === "desktop" ? "Desktop — 1440px" : viewport === "tablet" ? "Tablet — 768px" : "Mobile — 390px"}
                {" · "}{Math.round(zoom * 100)}%
                {selectedIds.size > 1 && ` · ${selectedIds.size} selected`}
              </p>
            )}
          </main>

          {/* ── Right Inspector ── */}
          <AnimatePresence initial={false}>
            {rightOpen && !isPreview && (
              <motion.aside key="right"
                initial={{ width: 0, opacity: 0 }} animate={{ width: 256, opacity: 1 }} exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className={cn("flex-shrink-0 border-l flex flex-col overflow-hidden", panelBg, border)}>
                <div className={cn("px-4 py-2.5 border-b flex-shrink-0 flex items-center justify-between", border)}>
                  <span className={cn("text-[11px] font-bold uppercase tracking-widest", textMuted)}>Inspector</span>
                  {(selectedNode || selectedIds.size > 1) && (
                    <button onClick={clearSelection} className={cn("p-1 rounded-md transition-colors", textMuted, "hover:bg-slate-100")}>
                      <X size={11} />
                    </button>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <InspectorPanel
                    node={selectedNode}
                    selectedIds={selectedIds}
                    onUpdateProp={updateProp}
                    onDelete={deleteNode}
                    onDuplicate={duplicateNode}
                    onMoveUp={(id) => moveNode(id, "up")}
                    onMoveDown={(id) => moveNode(id, "down")}
                    onBulkDelete={bulkDelete}
                    canMoveUp={canMoveUp}
                    canMoveDown={canMoveDown}
                    theme={theme}
                  />
                </div>
              </motion.aside>
            )}
          </AnimatePresence>

        </div>
      </div>
    </RekaProvider>
  );
}