import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

interface SentimentChartProps {
  sentiment: { positive: number; negative: number; neutral: number };
}

const COLORS = {
  positive: "hsl(142, 71%, 45%)",
  negative: "hsl(0, 84%, 60%)",
  neutral: "hsl(220, 10%, 46%)",
};

const SentimentChart = ({ sentiment }: SentimentChartProps) => {
  const total = sentiment.positive + sentiment.negative + sentiment.neutral;
  const data = [
    { name: "Positive", value: sentiment.positive, color: COLORS.positive },
    { name: "Neutral", value: sentiment.neutral, color: COLORS.neutral },
    { name: "Negative", value: sentiment.negative, color: COLORS.negative },
  ];

  const pct = (v: number) => total > 0 ? Math.round((v / total) * 100) : 0;

  return (
    <div className="flex items-center gap-8">
      <div className="w-40 h-40">
        <ResponsiveContainer>
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={40} outerRadius={70} dataKey="value" strokeWidth={2}>
              {data.map((d, i) => (
                <Cell key={i} fill={d.color} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => [`${value} (${pct(value)}%)`, ""]} />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="flex flex-col gap-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-3">
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: d.color }} />
            <span className="text-sm text-muted-foreground">{d.name}</span>
            <span className="font-semibold text-foreground">{pct(d.value)}%</span>
            <span className="text-xs text-muted-foreground">({d.value})</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SentimentChart;
