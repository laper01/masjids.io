// components/builder/templates/TemplatePicker.tsx
"use client";

/**
 * TemplatePicker — modal for selecting a page template.
 *
 * Two entry points:
 *  1. Auto-shown when the canvas is empty on first load
 *  2. Triggered by the "Templates" button in the topbar
 *
 * Props:
 *  - open        → controls visibility
 *  - onClose     → called when dismissed
 *  - onSelect    → called with the chosen template's CanvasNode[] tree
 *  - isDark      → matches builder theme
 */

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, LayoutTemplate, Search } from "lucide-react";
import { TEMPLATES, type PageTemplate, type TemplateCategory } from "./index";
import type { CanvasNode } from "@/app/(admin)/builder/page";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function cn(...classes: (string | undefined | false | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

const ALL_CATEGORIES: TemplateCategory[] = [
  "Blank", "Home", "Prayer", "About", "Ramadan", "Contact",
];

// ─── Template Card ────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  isDark,
  onSelect,
}: {
  template: PageTemplate;
  isDark: boolean;
  onSelect: (template: PageTemplate) => void;
}) {
  return (
    <motion.button
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => onSelect(template)}
      className={cn(
        "flex flex-col items-start gap-3 p-4 rounded-2xl border text-left transition-colors w-full",
        isDark
          ? "bg-slate-800 border-slate-700 hover:border-emerald-600 hover:bg-slate-700"
          : "bg-white border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40"
      )}
    >
      {/* Emoji preview */}
      <div className={cn(
        "w-full rounded-xl flex items-center justify-center text-4xl",
        isDark ? "bg-slate-700" : "bg-slate-50",
      )} style={{ height: 88 }}>
        {template.emoji}
      </div>

      {/* Meta */}
      <div className="flex flex-col gap-1 w-full">
        <div className="flex items-center justify-between gap-2">
          <span className={cn("text-sm font-bold", isDark ? "text-slate-100" : "text-slate-800")}>
            {template.name}
          </span>
          <span className={cn(
            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
            isDark ? "bg-slate-700 text-slate-400" : "bg-slate-100 text-slate-500"
          )}>
            {template.category}
          </span>
        </div>
        <p className={cn("text-xs leading-relaxed", isDark ? "text-slate-400" : "text-slate-500")}>
          {template.description}
        </p>
      </div>
    </motion.button>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────

interface TemplatePickerProps {
  open:     boolean;
  onClose:  () => void;
  onSelect: (tree: CanvasNode[]) => void;
  isDark:   boolean;
}

export default function TemplatePicker({
  open,
  onClose,
  onSelect,
  isDark,
}: TemplatePickerProps) {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory | "All">("All");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return TEMPLATES.filter((t) => {
      const matchCat    = activeCategory === "All" || t.category === activeCategory;
      const matchSearch = search.trim() === "" || t.name.toLowerCase().includes(search.toLowerCase()) || t.description.toLowerCase().includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [activeCategory, search]);

  function handleSelect(template: PageTemplate) {
    onSelect(template.tree());
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 12 }}
            transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
            onClick={(e) => e.stopPropagation()}
            className={cn(
              "w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl border flex flex-col overflow-hidden",
              isDark ? "bg-[#13151f] border-slate-700" : "bg-[#f8f9fc] border-slate-200"
            )}
          >
            {/* Header */}
            <div className={cn(
              "flex items-center justify-between px-6 py-4 border-b flex-shrink-0",
              isDark ? "border-slate-700 bg-[#0f1117]" : "border-slate-200 bg-white"
            )}>
              <div className="flex items-center gap-2.5">
                <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center",
                  isDark ? "bg-emerald-900 text-emerald-400" : "bg-emerald-50 text-emerald-600"
                )}>
                  <LayoutTemplate size={16} />
                </div>
                <div>
                  <h2 className={cn("text-sm font-bold", isDark ? "text-slate-100" : "text-slate-800")}>
                    Choose a Template
                  </h2>
                  <p className={cn("text-xs", isDark ? "text-slate-500" : "text-slate-400")}>
                    Start with a pre-built layout or a blank canvas
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className={cn(
                  "p-2 rounded-lg transition-colors",
                  isDark ? "hover:bg-slate-700 text-slate-400" : "hover:bg-slate-100 text-slate-500"
                )}
              >
                <X size={16} />
              </button>
            </div>

            {/* Search + category filter */}
            <div className={cn(
              "px-6 py-3 border-b flex items-center gap-3 flex-shrink-0 flex-wrap",
              isDark ? "border-slate-700" : "border-slate-200"
            )}>
              {/* Search */}
              <div className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-lg flex-1 min-w-[160px]",
                isDark ? "bg-slate-800 border border-slate-700" : "bg-white border border-slate-200"
              )}>
                <Search size={12} className={isDark ? "text-slate-500" : "text-slate-400"} />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className={cn(
                    "flex-1 bg-transparent outline-none text-xs placeholder:text-slate-400",
                    isDark ? "text-slate-200" : "text-slate-700"
                  )}
                />
                {search && (
                  <button onClick={() => setSearch("")} className={isDark ? "text-slate-500" : "text-slate-400"}>
                    <X size={10} />
                  </button>
                )}
              </div>

              {/* Category pills */}
              <div className="flex items-center gap-1.5 flex-wrap">
                {(["All", ...ALL_CATEGORIES] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setActiveCategory(cat as TemplateCategory | "All")}
                    className={cn(
                      "px-3 py-1 rounded-full text-[11px] font-semibold transition-colors",
                      activeCategory === cat
                        ? (isDark ? "bg-emerald-600 text-white" : "bg-emerald-600 text-white")
                        : (isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-white text-slate-500 hover:bg-slate-100 border border-slate-200")
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Template grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                  <Search size={24} className={isDark ? "text-slate-600" : "text-slate-300"} />
                  <p className={cn("text-sm font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>
                    No templates found
                  </p>
                  <p className={cn("text-xs", isDark ? "text-slate-600" : "text-slate-400")}>
                    Try a different keyword or category
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filtered.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      isDark={isDark}
                      onSelect={handleSelect}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className={cn(
              "px-6 py-3 border-t flex-shrink-0 flex items-center justify-between",
              isDark ? "border-slate-700" : "border-slate-200"
            )}>
              <p className={cn("text-[11px]", isDark ? "text-slate-500" : "text-slate-400")}>
                {filtered.length} template{filtered.length !== 1 ? "s" : ""} available
              </p>
              <button
                onClick={onClose}
                className={cn(
                  "text-xs font-semibold px-4 py-1.5 rounded-lg transition-colors",
                  isDark ? "text-slate-400 hover:bg-slate-700" : "text-slate-500 hover:bg-slate-100"
                )}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}