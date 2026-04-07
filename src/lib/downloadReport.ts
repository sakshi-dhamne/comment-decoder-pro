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
