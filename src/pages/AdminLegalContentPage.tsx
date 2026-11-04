import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  FileText,
  Save,
  CheckCircle,
  AlertCircle,
  Eye,
  Edit3,
  Undo2,
  Redo2,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading,
  Link2,
  Minus,
  ExternalLink,
} from "lucide-react";
import { getAdminLegalPage, updateAdminLegalPage } from "../services/api";
import type { LegalPage } from "../types";

type TabSlug = "terms-and-conditions" | "privacy-policy";

interface TabConfig {
  slug: TabSlug;
  label: string;
  defaultTitle: string;
  publicUrl: string;
}

const TABS: TabConfig[] = [
  {
    slug: "terms-and-conditions",
    label: "Terms & Conditions",
    defaultTitle: "Terms & Conditions",
    publicUrl: "http://localhost:5173/terms-and-conditions",
  },
  {
    slug: "privacy-policy",
    label: "Privacy Policy",
    defaultTitle: "Privacy Policy",
    publicUrl: "http://localhost:5173/privacy-policy",
  },
];

const MAX_CHARACTERS = 50000;

export default function AdminLegalContentPage() {
  const [activeTab, setActiveTab] = useState<TabSlug>("terms-and-conditions");
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");

  // Form states
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [status, setStatus] = useState<"published" | "draft">("published");
  const [initialData, setInitialData] = useState<LegalPage | null>(null);

  // Undo / Redo history stack
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  // Network & UI feedback states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const activeTabConfig = useMemo(() => {
    return TABS.find((t) => t.slug === activeTab) || TABS[0];
  }, [activeTab]);

  // Load content whenever active tab changes
  const loadPageContent = useCallback(async (slug: TabSlug) => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await getAdminLegalPage(slug);
      if (res && res.success && res.page) {
        setTitle(res.page.title || (slug === "terms-and-conditions" ? "Terms & Conditions" : "Privacy Policy"));
        setContent(res.page.content || "");
        setStatus(res.page.status || "published");
        setInitialData(res.page);
        setHistory([res.page.content || ""]);
        setHistoryIndex(0);
      }
    } catch (err: any) {
      console.error("[Load Legal Content Error]:", err);
      setErrorMsg(err.message || "Failed to load legal content for this section.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPageContent(activeTab);
  }, [activeTab, loadPageContent]);

  // Content change tracker with undo/redo stack
  const handleContentChange = (newVal: string) => {
    setContent(newVal);

    // Limit history stack depth to 50
    const newHistory = history.slice(0, historyIndex + 1);
    if (newHistory[newHistory.length - 1] !== newVal) {
      newHistory.push(newVal);
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  // Undo action
  const handleUndo = () => {
    if (historyIndex > 0) {
      const nextIdx = historyIndex - 1;
      setHistoryIndex(nextIdx);
      setContent(history[nextIdx]);
    }
  };

  // Redo action
  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      setContent(history[nextIdx]);
    }
  };

  // Toolbar formatting helper
  const handleInsertText = (prefix: string, suffix: string = "", placeholder: string = "text") => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = content.substring(start, end);

    const replacement = selected ? `${prefix}${selected}${suffix}` : `${prefix}${placeholder}${suffix}`;
    const newContent = content.substring(0, start) + replacement + content.substring(end);

    handleContentChange(newContent);

    setTimeout(() => {
      textarea.focus();
      const cursorStart = start + prefix.length;
      const cursorEnd = cursorStart + (selected.length || placeholder.length);
      textarea.setSelectionRange(cursorStart, cursorEnd);
    }, 0);
  };

  // Formatting actions
  const formatBold = () => handleInsertText("**", "**", "bold text");
  const formatItalic = () => handleInsertText("*", "*", "italic text");
  const formatUnderline = () => handleInsertText("<u>", "</u>", "underlined text");
  const formatStrike = () => handleInsertText("~~", "~~", "strikethrough");
  const formatBulletList = () => handleInsertText("- ", "", "List item");
  const formatNumberedList = () => handleInsertText("1. ", "", "List item");
  const formatParagraph = () => handleInsertText("\n\n", "", "New paragraph text");
  const formatHeading = () => handleInsertText("## ", "", "Section Heading");
  const formatDivider = () => handleInsertText("\n---\n", "", "");
  const formatLink = () => {
    const url = prompt("Enter link URL (e.g., https://example.com or mailto:support@pluxpc.com):", "https://");
    if (url) {
      handleInsertText("[", `](${url})`, "Link label");
    }
  };

  // Save changes handler
  const handleSave = async () => {
    if (!title.trim()) {
      setErrorMsg("Please enter a page title.");
      return;
    }
    if (!content.trim()) {
      setErrorMsg("Please enter legal page content.");
      return;
    }
    if (content.length > MAX_CHARACTERS) {
      setErrorMsg(`Content exceeds maximum allowed ${MAX_CHARACTERS.toLocaleString()} characters.`);
      return;
    }

    setIsSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await updateAdminLegalPage(activeTab, {
        title: title.trim(),
        content: content,
        status: status,
      });

      if (res && res.success && res.page) {
        setSuccessMsg(res.message || `"${res.page.title}" has been saved successfully!`);
        setInitialData(res.page);
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        setErrorMsg(res?.message || "Failed to save legal content.");
      }
    } catch (err: any) {
      console.error("[Save Legal Content Error]:", err);
      setErrorMsg(err.message || "Server error while saving legal content.");
    } finally {
      setIsSaving(false);
    }
  };

  // Discard changes
  const handleDiscard = () => {
    if (!initialData) return;
    if (window.confirm("Are you sure you want to revert your unsaved changes for this page?")) {
      setTitle(initialData.title);
      setContent(initialData.content);
      setStatus(initialData.status);
      setHistory([initialData.content]);
      setHistoryIndex(0);
      setSuccessMsg("Changes reverted to saved version.");
      setTimeout(() => setSuccessMsg(null), 3000);
    }
  };

  const isDirty = useMemo(() => {
    if (!initialData) return false;
    return (
      title !== initialData.title ||
      content !== initialData.content ||
      status !== initialData.status
    );
  }, [initialData, title, content, status]);

  // Handle switching tabs with unsaved changes check
  const handleTabSwitch = (slug: TabSlug) => {
    if (slug === activeTab) return;
    if (isDirty) {
      const confirmSwitch = window.confirm(
        "You have unsaved changes in the current tab. Are you sure you want to discard them and switch?"
      );
      if (!confirmSwitch) return;
    }
    setActiveTab(slug);
  };

  return (
    <div className="space-y-6 pb-12 font-sans">
      {/* ── Top Header Container ── */}
      <div className="bg-white border border-[#C5C9D0] rounded-xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 tracking-tight">
              Manage Legal Content
            </h1>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Authoritative Terms of Service and Privacy Policy documentation for the customer storefront.
          </p>
        </div>

        {/* Small Counter: 2 Content Pages */}
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-gray-50 border border-[#BFC5CE] text-xs font-bold text-gray-800 shadow-2xs">
            <FileText size={14} className="text-gray-500" />
            <span>2 Content Pages</span>
          </div>
        </div>
      </div>

      {/* ── Two Large Horizontal Tabs (Terms & Conditions | Privacy Policy) ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.slug;
          return (
            <button
              key={tab.slug}
              type="button"
              onClick={() => handleTabSwitch(tab.slug)}
              className={`py-3.5 px-6 rounded-xl font-bold text-sm sm:text-base transition-all duration-200 text-center flex items-center justify-center gap-2.5 cursor-pointer ${
                isActive
                  ? "bg-[#111827] text-white border border-[#111827] shadow-sm ring-1 ring-[#111827]"
                  : "bg-white text-gray-700 hover:text-gray-950 hover:bg-gray-50 border border-[#BFC5CE] shadow-2xs"
              }`}
            >
              <span>{tab.label}</span>
              {isActive && (
                <span className="w-2 h-2 rounded-full bg-[#E31E24] animate-pulse" />
              )}
            </button>
          );
        })}
      </div>

      {/* ── Alerts Banner ── */}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <AlertCircle size={16} className="text-red-600 flex-shrink-0" />
          <span className="flex-1">{errorMsg}</span>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-red-500 hover:text-red-800 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm font-semibold flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle size={16} className="text-emerald-600 flex-shrink-0" />
          <span className="flex-1">{successMsg}</span>
          <button
            onClick={() => setSuccessMsg(null)}
            className="text-emerald-600 hover:text-emerald-900 text-xs font-bold underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* ── Main Content Editor Card ── */}
      <div className="bg-white rounded-xl border border-[#C5C9D0] shadow-2xs overflow-hidden">
        {/* Card Header matching active tab */}
        <div className="p-5 sm:p-6 border-b border-[#C5C9D0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">
                Document Title
              </span>
            </div>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={activeTabConfig.defaultTitle}
              className="mt-1 text-lg sm:text-xl font-bold text-gray-900 bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[#111827] focus:outline-none transition-colors w-full"
            />
          </div>

          {/* Right Badges: Character Counter & Published/Draft Status */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Character Counter */}
            <div className="px-3.5 py-1.5 rounded-full text-xs font-bold font-mono bg-amber-50 text-amber-800 border border-amber-200 shadow-2xs">
              <span>{content.length.toLocaleString()}</span>
              <span className="text-amber-500 mx-1">/</span>
              <span>{MAX_CHARACTERS.toLocaleString()} Characters</span>
            </div>

            {/* Status Dropdown Pill */}
            <div className="relative inline-block">
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "published" | "draft")}
                className={`text-xs font-bold px-3 py-1.5 rounded-full border appearance-none pr-7 cursor-pointer transition-colors shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#111827] ${
                  status === "published"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-300 hover:bg-emerald-100"
                    : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"
                }`}
              >
                <option value="published">● Published</option>
                <option value="draft">○ Draft</option>
              </select>
              <span className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] text-gray-500">
                ▼
              </span>
            </div>

            {/* Live Storefront Link */}
            <a
              href={activeTabConfig.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              title="Open public page in new tab"
              className="p-2 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 border border-[#BFC5CE] transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
            >
              <ExternalLink size={14} />
              <span className="hidden sm:inline">View Public</span>
            </a>
          </div>
        </div>

        {/* ── Editor Toolbar & View Mode Tabs ── */}
        <div className="border-b border-[#C5C9D0] bg-[#F8FAFC] px-4 py-2.5 flex flex-wrap items-center justify-between gap-2">
          {/* Left: Mode Switcher (Edit vs Preview) */}
          <div className="flex items-center bg-gray-200/80 p-0.5 rounded-lg border border-[#BFC5CE]">
            <button
              type="button"
              onClick={() => setViewMode("edit")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "edit"
                  ? "bg-white text-gray-950 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Edit3 size={13} />
              <span>Editor</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                viewMode === "preview"
                  ? "bg-white text-gray-950 shadow-2xs"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Eye size={13} />
              <span>Preview</span>
            </button>
          </div>

          {/* Right: Rich Formatting Action Buttons (Visible in Edit mode) */}
          {viewMode === "edit" && (
            <div className="flex items-center gap-1 flex-wrap">
              <button
                type="button"
                onClick={formatBold}
                title="Bold (B)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors font-bold text-xs"
              >
                <Bold size={14} />
              </button>
              <button
                type="button"
                onClick={formatItalic}
                title="Italic (I)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors"
              >
                <Italic size={14} />
              </button>
              <button
                type="button"
                onClick={formatUnderline}
                title="Underline (U)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors"
              >
                <Underline size={14} />
              </button>
              <button
                type="button"
                onClick={formatStrike}
                title="Strikethrough (S)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors"
              >
                <Strikethrough size={14} />
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={formatBulletList}
                title="Bullet List (UL)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors"
              >
                <List size={14} />
              </button>
              <button
                type="button"
                onClick={formatNumberedList}
                title="Numbered List (1.)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors"
              >
                <ListOrdered size={14} />
              </button>
              <button
                type="button"
                onClick={formatHeading}
                title="Section Heading (H)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors text-xs font-bold"
              >
                <Heading size={14} />
              </button>
              <button
                type="button"
                onClick={formatParagraph}
                title="Paragraph (P)"
                className="px-2 py-1 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors font-bold text-xs"
              >
                P
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={formatLink}
                title="Insert Link"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors"
              >
                <Link2 size={14} />
              </button>
              <button
                type="button"
                onClick={formatDivider}
                title="Horizontal Rule (-)"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 border border-transparent hover:border-gray-300 transition-colors"
              >
                <Minus size={14} />
              </button>

              <div className="h-4 w-px bg-gray-300 mx-1" />

              <button
                type="button"
                onClick={handleUndo}
                disabled={historyIndex <= 0}
                title="Undo"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-gray-300 transition-colors"
              >
                <Undo2 size={14} />
              </button>
              <button
                type="button"
                onClick={handleRedo}
                disabled={historyIndex >= history.length - 1}
                title="Redo"
                className="p-1.5 rounded-md hover:bg-gray-200/80 text-gray-700 hover:text-gray-950 disabled:opacity-30 disabled:cursor-not-allowed border border-transparent hover:border-gray-300 transition-colors"
              >
                <Redo2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* ── Editor Body / Preview Body ── */}
        <div className="p-5 sm:p-6">
          {isLoading ? (
            <div className="py-24 text-center text-gray-500 text-xs flex flex-col items-center gap-2">
              <div className="w-8 h-8 border-2 border-gray-900 border-t-transparent rounded-full animate-spin" />
              <span>Loading legal content...</span>
            </div>
          ) : viewMode === "edit" ? (
            <textarea
              ref={textareaRef}
              rows={20}
              value={content}
              onChange={(e) => handleContentChange(e.target.value)}
              placeholder="Enter legal terms and policy content using Markdown formatting..."
              className="w-full p-4 bg-gray-50/70 border border-[#BFC5CE] rounded-xl text-xs sm:text-sm font-mono text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-[#111827] focus:border-[#111827] leading-relaxed resize-y min-h-[460px]"
            />
          ) : (
            /* ── Live Preview Mode ── */
            <div className="bg-gray-50/50 border border-[#BFC5CE] rounded-xl p-6 sm:p-8 max-h-[600px] overflow-y-auto space-y-4">
              {content.trim() ? (
                <div className="prose prose-sm max-w-none text-gray-800 space-y-4">
                  {content.split("\n").map((line, idx) => {
                    const trimmed = line.trim();

                    if (trimmed.startsWith("## ")) {
                      return (
                        <h2
                          key={idx}
                          className="text-lg sm:text-xl font-extrabold text-gray-900 mt-6 mb-2 pb-1 border-b border-gray-200"
                        >
                          {trimmed.replace(/^##\s+/, "")}
                        </h2>
                      );
                    }

                    if (trimmed.startsWith("### ")) {
                      return (
                        <h3 key={idx} className="text-base font-bold text-gray-800 mt-4 mb-1">
                          {trimmed.replace(/^###\s+/, "")}
                        </h3>
                      );
                    }

                    if (trimmed.startsWith("> ")) {
                      return (
                        <blockquote
                          key={idx}
                          className="my-3 p-3.5 border-l-4 border-[#E31E24] bg-red-50 text-gray-800 italic rounded-r-lg text-xs sm:text-sm"
                        >
                          {trimmed.replace(/^>\s+/, "")}
                        </blockquote>
                      );
                    }

                    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
                      return (
                        <li key={idx} className="ml-5 list-disc text-xs sm:text-sm text-gray-700 leading-relaxed">
                          {trimmed.substring(2)}
                        </li>
                      );
                    }

                    if (/^\d+\.\s+/.test(trimmed)) {
                      return (
                        <li key={idx} className="ml-5 list-decimal text-xs sm:text-sm text-gray-700 leading-relaxed">
                          {trimmed.replace(/^\d+\.\s+/, "")}
                        </li>
                      );
                    }

                    if (trimmed === "---") {
                      return <hr key={idx} className="my-6 border-gray-200" />;
                    }

                    if (!trimmed) {
                      return <div key={idx} className="h-1.5" />;
                    }

                    return (
                      <p key={idx} className="text-xs sm:text-sm text-gray-700 leading-relaxed">
                        {trimmed}
                      </p>
                    );
                  })}
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 text-xs italic">
                  No content entered yet. Switch back to the Editor tab to start writing.
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Footer Action Bar ── */}
        <div className="p-4 sm:p-5 border-t border-[#C5C9D0] bg-[#F8FAFC] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-gray-500 font-medium">
            {initialData?.updatedAt ? (
              <span>
                Last updated on{" "}
                <strong className="text-gray-700">
                  {new Date(initialData.updatedAt).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </strong>{" "}
                by {initialData.lastUpdatedBy || "Admin"}
              </span>
            ) : (
              <span>Not published yet</span>
            )}
            {isDirty && (
              <span className="ml-2 text-amber-600 font-bold">• Unsaved changes</span>
            )}
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {isDirty && (
              <button
                type="button"
                onClick={handleDiscard}
                disabled={isSaving}
                className="px-4 py-2.5 rounded-xl border border-[#BFC5CE] hover:bg-gray-100 text-gray-700 text-xs sm:text-sm font-semibold transition-colors cursor-pointer"
              >
                Discard
              </button>
            )}

            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !title.trim() || !content.trim()}
              className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-[#E31E24] hover:bg-[#C9191E] text-white text-xs sm:text-sm font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save size={16} />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
