import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface UrlInputProps {
  onSubmit: (url: string) => void;
  isLoading: boolean;
}

const UrlInput = ({ onSubmit, isLoading }: UrlInputProps) => {
  const [url, setUrl] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (url.trim()) onSubmit(url.trim());
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 w-full max-w-2xl mx-auto">
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="Paste a YouTube video URL..."
        className="h-12 text-base bg-card border-border"
        disabled={isLoading}
      />
      <Button type="submit" disabled={isLoading || !url.trim()} className="h-12 px-6 gap-2">
        <Search className="w-4 h-4" />
        {isLoading ? "Analyzing..." : "Analyze"}
      </Button>
    </form>
  );
};

export default UrlInput;
