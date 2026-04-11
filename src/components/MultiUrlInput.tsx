import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, GitCompareArrows, Clock, Trash2 } from "lucide-react";

const HISTORY_KEY = "yt-search-history";
const LAST_URL_KEY = "yt-last-url";
const MAX_HISTORY = 20;

function getHistory(): string[] {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveToHistory(url: string) {
  const history = getHistory().filter((u) => u !== url);
  history.unshift(url);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
  localStorage.setItem(LAST_URL_KEY, url);
}

interface MultiUrlInputProps {
  onSubmitSingle: (url: string) => void;
  onSubmitMultiple: (urls: string[]) => void;
  isLoading: boolean;
}

const MultiUrlInput = ({ onSubmitSingle, onSubmitMultiple, isLoading }: MultiUrlInputProps) => {
  const [urls, setUrls] = useState<string[]>(() => {
    const last = localStorage.getItem(LAST_URL_KEY);
    return [last || ""];
  });
  const [compareMode, setCompareMode] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [activeInput, setActiveInput] = useState(0);
  const [history, setHistory] = useState<string[]>(getHistory);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setShowHistory(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validUrls = urls.map((u) => u.trim()).filter(Boolean);
    if (validUrls.length === 0) return;

    // Check for duplicate URLs in compare mode
    if (validUrls.length > 1) {
      const unique = new Set(validUrls);
      if (unique.size !== validUrls.length) {
        toast({ title: "Duplicate URLs", description: "Please use different URLs for comparison.", variant: "destructive" });
        return;
      }
    }

    validUrls.forEach(saveToHistory);
    setHistory(getHistory());
    if (validUrls.length === 1) {
      onSubmitSingle(validUrls[0]);
    } else {
      onSubmitMultiple(validUrls);
    }
  };

  const addUrl = () => {
    if (urls.length < 5) setUrls([...urls, ""]);
  };

  const removeUrl = (idx: number) => {
    const next = urls.filter((_, i) => i !== idx);
    if (next.length === 0) next.push("");
    if (next.length === 1) setCompareMode(false);
    setUrls(next);
  };

  const updateUrl = (idx: number, value: string) => {
    const next = [...urls];
    next[idx] = value;
    setUrls(next);
  };

  const selectHistory = (url: string) => {
    updateUrl(activeInput, url);
    setShowHistory(false);
  };

  const clearHistory = () => {
    localStorage.removeItem(HISTORY_KEY);
    setHistory([]);
  };

  const removeHistoryItem = (e: React.MouseEvent, url: string) => {
    e.stopPropagation();
    const updated = history.filter((u) => u !== url);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
    setHistory(updated);
  };

  const toggleCompare = () => {
    if (compareMode) {
      setUrls([urls[0] || ""]);
      setCompareMode(false);
    } else {
      if (urls.length < 2) setUrls([...urls, ""]);
      setCompareMode(true);
    }
  };

  const filteredHistory = history.filter((h) =>
    h.toLowerCase().includes((urls[activeInput] || "").toLowerCase())
  );

  return (
    <div ref={wrapperRef} className="w-full max-w-2xl mx-auto relative">
      <form onSubmit={handleSubmit} className="space-y-3">
        {urls.map((url, i) => (
          <div key={i} className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={url}
                onChange={(e) => updateUrl(i, e.target.value)}
                onFocus={() => {
                  setActiveInput(i);
                  if (history.length > 0) setShowHistory(true);
                }}
                placeholder={compareMode ? `YouTube URL #${i + 1}` : "Paste a YouTube video URL..."}
                className="h-12 text-base bg-card border-border"
                disabled={isLoading}
              />
            </div>
            {compareMode && urls.length > 1 && (
              <Button type="button" variant="ghost" size="icon" onClick={() => removeUrl(i)} className="h-12 w-12 shrink-0">
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}

        <div className="flex gap-2 items-center">
          <Button type="submit" disabled={isLoading || !urls.some((u) => u.trim())} className="h-10 px-6 gap-2">
            <Search className="w-4 h-4" />
            {isLoading ? "Analyzing..." : compareMode ? "Compare" : "Analyze"}
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={toggleCompare} className="gap-2 h-10">
            <GitCompareArrows className="w-4 h-4" />
            {compareMode ? "Single Mode" : "Compare Videos"}
          </Button>
          {compareMode && urls.length < 5 && (
            <Button type="button" variant="ghost" size="sm" onClick={addUrl} className="gap-1 h-10">
              <Plus className="w-4 h-4" /> Add URL
            </Button>
          )}
        </div>
      </form>

      {/* History dropdown */}
      {showHistory && filteredHistory.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-lg shadow-lg overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-border">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" /> Recent searches
            </span>
            <Button type="button" variant="ghost" size="sm" onClick={clearHistory} className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive gap-1">
              <Trash2 className="w-3 h-3" /> Clear
            </Button>
          </div>
          <ul className="max-h-48 overflow-y-auto">
            {filteredHistory.map((item) => (
              <li
                key={item}
                onClick={() => selectHistory(item)}
                className="px-3 py-2 text-sm text-foreground hover:bg-accent cursor-pointer flex items-center justify-between group"
              >
                <span className="truncate flex-1">{item}</span>
                <button
                  onClick={(e) => removeHistoryItem(e, item)}
                  className="opacity-0 group-hover:opacity-100 ml-2 text-muted-foreground hover:text-destructive transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default MultiUrlInput;
