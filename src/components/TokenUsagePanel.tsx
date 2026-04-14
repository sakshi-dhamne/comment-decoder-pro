import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronUp, Cpu, Zap, SkipForward } from "lucide-react";
import type { TokenUsage } from "@/types/analysis";

interface TokenUsagePanelProps {
  tokenUsage: TokenUsage;
  totalComments: number;
}

const TokenUsagePanel = ({ tokenUsage, totalComments }: TokenUsagePanelProps) => {
  const [expanded, setExpanded] = useState(false);

  // Rough cost estimates (Gemini flash-lite ~$0.075/1M input, $0.30/1M output; flash ~$0.15/1M input, $0.60/1M output)
  // Blended estimate since we use both models
  const estimatedCost = (tokenUsage.inputTokens * 0.0001 + tokenUsage.outputTokens * 0.00045) / 1000;
  const savedComments = tokenUsage.skippedByKeyword + tokenUsage.skippedByDedup;
  const savingsPercent = totalComments > 0 ? Math.round((savedComments / totalComments) * 100) : 0;

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/30">
      <CardContent className="py-3 px-4">
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex items-center justify-between w-full text-left"
        >
          <div className="flex items-center gap-2">
            <Cpu className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground">AI Usage</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
              ~${estimatedCost.toFixed(4)}
            </Badge>
            {savingsPercent > 0 && (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-green-600 border-green-300">
                {savingsPercent}% saved
              </Badge>
            )}
          </div>
          {expanded ? (
            <ChevronUp className="w-3.5 h-3.5 text-muted-foreground" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
          )}
        </button>

        {expanded && (
          <div className="mt-3 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <Zap className="w-3 h-3" /> AI Calls
              </p>
              <p className="font-mono font-semibold text-foreground">{tokenUsage.aiCalls}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Input Tokens</p>
              <p className="font-mono font-semibold text-foreground">{tokenUsage.inputTokens.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Output Tokens</p>
              <p className="font-mono font-semibold text-foreground">{tokenUsage.outputTokens.toLocaleString()}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground flex items-center gap-1">
                <SkipForward className="w-3 h-3" /> Keyword Pre-classified
              </p>
              <p className="font-mono font-semibold text-green-600">{tokenUsage.skippedByKeyword}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Deduplicated</p>
              <p className="font-mono font-semibold text-green-600">{tokenUsage.skippedByDedup}</p>
            </div>
            <div className="space-y-1">
              <p className="text-muted-foreground">Total Tokens</p>
              <p className="font-mono font-semibold text-foreground">{tokenUsage.totalTokens.toLocaleString()}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TokenUsagePanel;
