import { Badge } from "@/components/ui/badge";

interface KeywordCloudProps {
  keywords: { word: string; count: number }[];
}

const KeywordCloud = ({ keywords }: KeywordCloudProps) => {
  if (!keywords.length) return <p className="text-muted-foreground text-sm">No keywords detected.</p>;

  const maxCount = Math.max(...keywords.map(k => k.count));
  const minCount = Math.min(...keywords.map(k => k.count));
  const range = maxCount - minCount || 1;

  const getSize = (count: number): string => {
    const ratio = (count - minCount) / range;
    if (ratio > 0.75) return "text-lg font-bold";
    if (ratio > 0.5) return "text-base font-semibold";
    if (ratio > 0.25) return "text-sm font-medium";
    return "text-xs";
  };

  const getOpacity = (count: number): number => {
    return 0.5 + ((count - minCount) / range) * 0.5;
  };

  return (
    <div className="flex flex-wrap gap-2 items-center justify-center py-4">
      {keywords.map((k) => (
        <Badge
          key={k.word}
          variant="outline"
          className={`${getSize(k.count)} px-3 py-1 cursor-default transition-transform hover:scale-110`}
          style={{ opacity: getOpacity(k.count) }}
        >
          {k.word}
          <span className="ml-1 text-muted-foreground font-normal text-[10px]">{k.count}</span>
        </Badge>
      ))}
    </div>
  );
};

export default KeywordCloud;
