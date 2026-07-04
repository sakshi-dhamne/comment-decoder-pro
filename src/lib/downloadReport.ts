import { getAllCachedReplies } from "./replyCache";

export function downloadJSON(data: any, filename: string) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function downloadCSV(comments: any[], filename: string) {
  const header = "Author,Sentiment,Likes,Text\n";
  const rows = comments.map(c =>
    `"${c.author.replace(/"/g, '""')}","${c.sentiment}",${c.likeCount},"${c.text.replace(/"/g, '""').replace(/\n/g, ' ')}"`
  ).join("\n");
  const blob = new Blob([header + rows], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function esc(v: any): string {
  const s = v === null || v === undefined ? "" : String(v);
  return `"${s.replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;
}


export function downloadFullReportCSV(result: any, filename: string) {
  const lines: string[] = [];

  // Video
  lines.push("SECTION,Video");
  lines.push("Title,Channel,Views,Comments,Analyzed");
  lines.push([result.video?.title, result.video?.channelTitle, result.video?.viewCount, result.video?.commentCount, result.totalAnalyzed].map(esc).join(","));
  lines.push("");

  // Sentiment
  lines.push("SECTION,Sentiment Breakdown");
  lines.push("Sentiment,Count");
  const s = result.sentiment || {};
  lines.push(`Positive,${s.positive ?? 0}`);
  lines.push(`Negative,${s.negative ?? 0}`);
  lines.push(`Neutral,${s.neutral ?? 0}`);
  lines.push("");

  // Categories
  lines.push("SECTION,Categories");
  lines.push("Category,Count");
  Object.entries(result.categories || {}).forEach(([k, v]) => lines.push(`${esc(k)},${v}`));
  lines.push("");

  // Topics
  lines.push("SECTION,Top Topics");
  lines.push("Topic,Count");
  (result.topics || []).forEach((t: any) => lines.push(`${esc(t.topic)},${t.count}`));
  lines.push("");

  // Comments + replies
  lines.push("SECTION,Comments & Generated Replies");
  lines.push("Author,Sentiment,Category,Likes,Comment,Tone,Reply");
  (result.comments || []).forEach((c: any) => {
    const cached = getAllCachedReplies(c.text, result.video?.title);
    const tones = Object.keys(cached);
    if (!tones.length) {
      lines.push([c.author, c.sentiment, c.category, c.likeCount, c.text, "", ""].map(esc).join(","));
    } else {
      tones.forEach((tone) => {
        (cached[tone] || []).forEach((reply: string) => {
          lines.push([c.author, c.sentiment, c.category, c.likeCount, c.text, tone, reply].map(esc).join(","));
        });
      });
    }
  });

  const blob = new Blob([lines.join("\n")], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
