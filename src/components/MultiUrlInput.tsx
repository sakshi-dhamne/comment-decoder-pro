import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Plus, X, GitCompareArrows } from "lucide-react";

interface MultiUrlInputProps {
  onSubmitSingle: (url: string) => void;
  onSubmitMultiple: (urls: string[]) => void;
  isLoading: boolean;
}

const MultiUrlInput = ({ onSubmitSingle, onSubmitMultiple, isLoading }: MultiUrlInputProps) => {
  const [urls, setUrls] = useState<string[]>([""]);
  const [compareMode, setCompareMode] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validUrls = urls.map(u => u.trim()).filter(Boolean);
    if (validUrls.length === 0) return;
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

  const toggleCompare = () => {
    if (compareMode) {
      setUrls([urls[0] || ""]);
      setCompareMode(false);
    } else {
      if (urls.length < 2) setUrls([...urls, ""]);
      setCompareMode(true);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-2xl mx-auto space-y-3">
      {urls.map((url, i) => (
        <div key={i} className="flex gap-2">
          <Input
            value={url}
            onChange={(e) => updateUrl(i, e.target.value)}
            placeholder={compareMode ? `YouTube URL #${i + 1}` : "Paste a YouTube video URL..."}
            className="h-12 text-base bg-card border-border"
            disabled={isLoading}
          />
          {compareMode && urls.length > 1 && (
            <Button type="button" variant="ghost" size="icon" onClick={() => removeUrl(i)} className="h-12 w-12 shrink-0">
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
      ))}

      <div className="flex gap-2 items-center">
        <Button type="submit" disabled={isLoading || !urls.some(u => u.trim())} className="h-10 px-6 gap-2">
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
  );
};

export default MultiUrlInput;
