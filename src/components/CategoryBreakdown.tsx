import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from "recharts";

interface CategoryBreakdownProps {
  categories: Record<string, number>;
  categorySamples: Record<string, string[]>;
}

const CATEGORY_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
  praise: { label: "Praise", color: "hsl(142, 71%, 45%)", emoji: "🎉" },
  complaint: { label: "Complaints", color: "hsl(0, 84%, 60%)", emoji: "😤" },
  question: { label: "Questions", color: "hsl(210, 80%, 55%)", emoji: "❓" },
  suggestion: { label: "Suggestions", color: "hsl(45, 90%, 50%)", emoji: "💡" },
  spam: { label: "Spam", color: "hsl(220, 10%, 60%)", emoji: "🚫" },
  other: { label: "Other", color: "hsl(220, 10%, 46%)", emoji: "📝" },
};

const CategoryBreakdown = ({ categories, categorySamples }: CategoryBreakdownProps) => {
  const chartData = Object.entries(categories)
    .filter(([_, count]) => count > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([key, count]) => ({
      name: CATEGORY_CONFIG[key]?.label || key,
      count,
      color: CATEGORY_CONFIG[key]?.color || "hsl(220, 10%, 46%)",
      key,
    }));

  const total = Object.values(categories).reduce((s, c) => s + c, 0);

  return (
    <div className="space-y-4">
      {/* Bar Chart */}
      <div className="h-48">
        <ResponsiveContainer>
          <BarChart data={chartData} layout="vertical" margin={{ left: 80 }}>
            <XAxis type="number" hide />
            <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={75} />
            <Tooltip formatter={(value: number) => [`${value} (${Math.round(value / total * 100)}%)`, "Count"]} />
            <Bar dataKey="count" radius={[0, 4, 4, 0]}>
              {chartData.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Sample Comments per Category */}
      <div className="space-y-3">
        {chartData.slice(0, 4).map((d) => {
          const samples = categorySamples[d.key] || [];
          if (samples.length === 0) return null;
          return (
            <div key={d.key} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span>{CATEGORY_CONFIG[d.key]?.emoji}</span>
                <Badge variant="secondary" className="text-xs">{d.name}</Badge>
                <span className="text-xs text-muted-foreground">{d.count} comments</span>
              </div>
              {samples.map((s, i) => (
                <p key={i} className="text-xs text-muted-foreground pl-7 truncate max-w-lg">"{s}"</p>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CategoryBreakdown;
