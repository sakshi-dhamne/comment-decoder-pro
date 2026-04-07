import { Badge } from "@/components/ui/badge";

interface Topic {
  topic: string;
  count: number;
  comments: string[];
}

const TopicList = ({ topics }: { topics: Topic[] }) => {
  if (!topics.length) return <p className="text-muted-foreground text-sm">No clear topics detected.</p>;

  return (
    <div className="space-y-4">
      {topics.map((t, i) => (
        <div key={i} className="space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize text-sm font-medium">
              {t.topic}
            </Badge>
            <span className="text-xs text-muted-foreground">{t.count} mentions</span>
          </div>
          <div className="pl-4 space-y-1">
            {t.comments.map((c, j) => (
              <p key={j} className="text-xs text-muted-foreground truncate max-w-lg">"{c}"</p>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default TopicList;
