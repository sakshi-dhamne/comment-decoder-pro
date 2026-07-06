import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, PlayCircle, TrendingUp, TrendingDown, MessageCircle } from "lucide-react";
import type { AnalysisResult, TimelineHotspot } from "@/types/analysis";

function fmt(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}` : `${m}:${String(s).padStart(2, "0")}`;
}

function dominant(h: TimelineHotspot): "positive" | "negative" | "neutral" {
  const { positive, negative, neutral } = h.sentiment;
  if (positive >= negative && positive >= neutral) return "positive";
  if (negative >= neutral) return "negative";
  return "neutral";
}

const DOT_COLOR: Record<string, string> = {
  positive: "bg-[hsl(var(--positive))]",
  negative: "bg-[hsl(var(--negative))]",
  neutral: "bg-[hsl(var(--neutral))]",
};

interface Props {
  result: AnalysisResult;
}

export default function TimelineView({ result }: Props) {
  const tl = result.timeline;
  const [activeIdx, setActiveIdx] = useState<number | null>(tl?.hotspots.length ? 0 : null);

  const videoIdMatch = result.video.thumbnail?.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
  const videoId = videoIdMatch?.[1];

  const active = activeIdx != null ? tl?.hotspots[activeIdx] : null;

  const activeComments = useMemo(() => {
    if (!active) return [];
    return active.commentIndices
      .map((i) => result.comments[i])
      .filter(Boolean)
      .sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0))
      .slice(0, 5);
  }, [active, result.comments]);

  if (!tl || !tl.hasTranscript || !tl.hotspots.length) {
    return (
      <Card>
        <CardContent className="py-10 text-center space-y-2">
          <Activity className="w-8 h-8 text-muted-foreground/40 mx-auto" />
          <p className="text-sm font-medium text-foreground">
            {tl?.hasTranscript === false
              ? "Transcript unavailable for this video"
              : "Not enough timestamped comments to build a timeline"}
          </p>
          <p className="text-xs text-muted-foreground">
            The timeline maps comments that reference specific moments (e.g. "3:42 that transition!") back to the transcript.
          </p>
        </CardContent>
      </Card>
    );
  }

  const dur = tl.duration || tl.hotspots[tl.hotspots.length - 1].end;

  return (
    <div className="space-y-4">
      {/* Timeline scrubber */}
      <Card>
        <CardContent className="pt-6 pb-5">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">Reaction hotspots</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {tl.hotspots.length} moments · {Object.keys(tl.commentTimestamps).length} timestamped comments · {tl.unmappedCount} general
            </span>
          </div>

          <div className="relative h-14 bg-muted/40 rounded-md">
            {/* time ticks */}
            <div className="absolute inset-x-0 top-0 h-full flex justify-between px-1 text-[10px] text-muted-foreground/70 pointer-events-none">
              <span className="mt-1">0:00</span>
              <span className="mt-1">{fmt(dur / 2)}</span>
              <span className="mt-1">{fmt(dur)}</span>
            </div>
            {/* markers */}
            {tl.hotspots.map((h, i) => {
              const leftPct = Math.min(99, (h.start / Math.max(dur, 1)) * 100);
              const widthPct = Math.max(1.5, ((h.end - h.start) / Math.max(dur, 1)) * 100);
              const size = Math.min(28, 10 + h.commentIndices.length * 2);
              const isActive = i === activeIdx;
              return (
                <button
                  key={i}
                  onClick={() => setActiveIdx(i)}
                  className="absolute top-1/2 -translate-y-1/2 group"
                  style={{ left: `${leftPct}%`, width: `${widthPct}%` }}
                  title={`${fmt(h.start)} · ${h.commentIndices.length} comments`}
                >
                  <div
                    className={`${DOT_COLOR[dominant(h)]} rounded-full mx-auto transition-all ${isActive ? "ring-2 ring-primary ring-offset-2 ring-offset-background scale-110" : "opacity-80 group-hover:opacity-100"}`}
                    style={{ width: size, height: size }}
                  />
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-4 mt-3 text-[11px] text-muted-foreground">
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT_COLOR.positive}`} /> Positive</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT_COLOR.negative}`} /> Negative</span>
            <span className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${DOT_COLOR.neutral}`} /> Mixed</span>
            <span className="ml-auto">Marker size = comment volume</span>
          </div>
        </CardContent>
      </Card>

      {/* Active hotspot detail */}
      {active && (
        <div className="grid md:grid-cols-2 gap-4">
          <Card>
            <CardContent className="pt-5 space-y-3">
              <div className="flex items-center justify-between">
                <Badge variant="outline" className="font-mono">
                  {fmt(active.start)} – {fmt(active.end)}
                </Badge>
                {videoId && (
                  <a
                    href={`https://youtu.be/${videoId}?t=${active.start}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <PlayCircle className="w-3.5 h-3.5" /> Watch on YouTube
                  </a>
                )}
              </div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">Transcript</p>
                <p className="text-sm text-foreground leading-relaxed">{active.transcript || "(no transcript text for this window)"}</p>
              </div>
              <div className="flex gap-2 text-xs">
                <Badge variant="secondary" className="gap-1"><TrendingUp className="w-3 h-3 text-[hsl(var(--positive))]" />{active.sentiment.positive}</Badge>
                <Badge variant="secondary" className="gap-1"><TrendingDown className="w-3 h-3 text-[hsl(var(--negative))]" />{active.sentiment.negative}</Badge>
                <Badge variant="secondary" className="gap-1"><MessageCircle className="w-3 h-3" />{active.sentiment.neutral} mixed</Badge>
              </div>
              <div className="border-l-2 border-primary/50 pl-3 py-1 bg-primary/5 rounded-r">
                <p className="text-xs font-medium text-primary mb-0.5">Suggestion</p>
                <p className="text-xs text-foreground/80">{active.suggestion}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-5">
              <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">
                Top comments at this moment
              </p>
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {activeComments.map((c, i) => (
                  <div key={i} className="text-sm border-b border-border pb-2 last:border-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-medium text-foreground">{c.author}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                        c.sentiment === "positive" ? "bg-[hsl(var(--positive))]/10 text-[hsl(var(--positive))]"
                        : c.sentiment === "negative" ? "bg-[hsl(var(--negative))]/10 text-[hsl(var(--negative))]"
                        : "bg-muted text-muted-foreground"
                      }`}>{c.sentiment}</span>
                      <span className="text-[10px] text-muted-foreground ml-auto">{c.likeCount} likes</span>
                    </div>
                    <p className="text-xs text-foreground/80 leading-relaxed">{c.text}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Hotspot list (jump targets) */}
      <Card>
        <CardContent className="pt-5">
          <p className="text-xs font-medium text-muted-foreground mb-3 uppercase tracking-wide">All hotspots</p>
          <div className="space-y-1.5">
            {tl.hotspots.map((h, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`w-full flex items-center gap-3 text-left px-3 py-2 rounded-md transition-colors ${
                  i === activeIdx ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${DOT_COLOR[dominant(h)]}`} />
                <span className="font-mono text-xs text-muted-foreground w-20">{fmt(h.start)}</span>
                <span className="text-xs text-foreground/80 flex-1 truncate">{h.transcript.slice(0, 90) || "(no transcript)"}</span>
                <span className="text-xs text-muted-foreground whitespace-nowrap">{h.commentIndices.length} comments</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
