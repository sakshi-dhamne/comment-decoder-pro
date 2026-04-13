import { useState } from "react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface Comment {
  author: string;
  text: string;
  sentiment: string;
}

interface SentimentChartProps {
  sentiment: { positive: number; negative: number; neutral: number };
  comments?: Comment[];
}

const COLORS = {
  positive: "hsl(142, 71%, 45%)",
  negative: "hsl(0, 84%, 60%)",
  neutral: "hsl(220, 10%, 46%)",
};

const SentimentChart = ({ sentiment, comments = [] }: SentimentChartProps) => {
  const [selected, setSelected] = useState<"positive" | "negative" | "neutral" | null>(null);
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const data = [
    { name: "Positive", key: "positive" as const, value: sentiment.positive, color: COLORS.positive },
    { name: "Neutral", key: "neutral" as const, value: sentiment.neutral, color: COLORS.neutral },
    { name: "Negative", key: "negative" as const, value: sentiment.negative, color: COLORS.negative },
  ];

  const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

  const filteredComments = selected
    ? comments.filter(c => c.sentiment === selected).slice(0, 5)
    : [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-8">
        <div className="w-40 h-40">
          <ResponsiveContainer>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={40}
                outerRadius={70}
                dataKey="value"
                strokeWidth={2}
                onClick={(_, index) => {
                  const clicked = data[index].key;
                  setSelected(prev => prev === clicked ? null : clicked);
                }}
                className="cursor-pointer"
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fill={d.color}
                    opacity={selected && selected !== d.key ? 0.3 : 1}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => [`${value} (${pct(value)}%)`, ""]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex flex-col gap-3">
          {data.map((d) => (
            <div
              key={d.name}
              className="flex items-center gap-3 cursor-pointer rounded px-2 py-1 hover:bg-accent transition-colors"
              onClick={() => setSelected(prev => prev === d.key ? null : d.key)}
            >
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
              <span className="text-sm text-muted-foreground">{d.name}</span>
              <span className="font-semibold text-foreground">{pct(d.value)}%</span>
              <span className="text-xs text-muted-foreground">({d.value})</span>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="border-t border-border pt-4">
          <h4 className="text-sm font-medium text-foreground mb-3 capitalize">
            Top 5 {selected} comments
          </h4>
          {filteredComments.length > 0 ? (
            <div className="space-y-2">
              {filteredComments.map((c, i) => (
                <div key={i} className="p-3 rounded-md bg-muted/50 text-sm">
                  <p className="text-foreground">{c.text.slice(0, 200)}</p>
                  <p className="text-xs text-muted-foreground mt-1">— {c.author}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No {selected} comments found.</p>
          )}
        </div>
      )}
    </div>
  );
};

export default SentimentChart;
