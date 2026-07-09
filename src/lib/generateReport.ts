import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { getAllCachedReplies } from "./replyCache";
import {
  FREE_DAILY_LIMIT,
  FREE_REPLY_DAILY_LIMIT,
  getUsedToday,
  getUsedRepliesToday,
  getRemainingAnalyses,
  getRemainingReplies,
  isPremium,
  getAdStats,
} from "./usageTracking";
import type { AnalysisResult } from "@/types/analysis";

/* ─── Color palette ─── */
const C = {
  primary: [37, 99, 235] as [number, number, number],
  primaryDark: [29, 78, 216] as [number, number, number],
  text: [30, 41, 59] as [number, number, number],
  muted: [100, 116, 139] as [number, number, number],
  border: [226, 232, 240] as [number, number, number],
  positive: [34, 197, 94] as [number, number, number],
  negative: [239, 68, 68] as [number, number, number],
  neutral: [148, 163, 184] as [number, number, number],
  headerBg: [241, 245, 249] as [number, number, number],
  altRow: [250, 250, 252] as [number, number, number],
  accent: [168, 85, 247] as [number, number, number],
};

const CATEGORY_PALETTE: [number, number, number][] = [
  [37, 99, 235], [168, 85, 247], [236, 72, 153], [249, 115, 22],
  [234, 179, 8], [34, 197, 94], [20, 184, 166], [14, 165, 233],
];

function slug(s: string, max = 40): string {
  return s.toLowerCase().replace(/[^\w]+/g, "-").replace(/^-|-$/g, "").slice(0, max) || "report";
}

/**
 * jsPDF's default Helvetica uses WinAnsi encoding — emojis and non-Latin1
 * glyphs render as garbled character blocks. Strip them so text stays readable.
 */
function clean(s: string | undefined | null): string {
  if (!s) return "";
  return s
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014\u2015]/g, "-")
    .replace(/\u2026/g, "...")
    .replace(/\u00A0/g, " ")
    // Remove anything outside printable ASCII (drops emojis + non-Latin scripts).
    .replace(/[^\x20-\x7E\n]/g, "")
    .replace(/[ \t]+/g, " ")
    .trim();
}

/* ─── Canvas chart helpers (rendered to PNG then embedded) ─── */

function makeCanvas(w: number, h: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  const dpr = 2;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(dpr, dpr);
  ctx.font = "12px Helvetica, Arial, sans-serif";
  return { canvas, ctx };
}

function rgb([r, g, b]: [number, number, number], a = 1) {
  return `rgba(${r},${g},${b},${a})`;
}

function drawDonut(data: { label: string; value: number; color: [number, number, number] }[], w = 320, h = 220): string {
  const { canvas, ctx } = makeCanvas(w, h);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const cx = 110, cy = h / 2, r = 80, ir = 48;

  let start = -Math.PI / 2;
  data.forEach((d) => {
    const angle = (d.value / total) * Math.PI * 2;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, start, start + angle);
    ctx.closePath();
    ctx.fillStyle = rgb(d.color);
    ctx.fill();
    start += angle;
  });
  // Hole
  ctx.beginPath();
  ctx.arc(cx, cy, ir, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();

  // Center label
  ctx.fillStyle = rgb(C.text);
  ctx.font = "bold 18px Helvetica";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(String(total), cx, cy - 6);
  ctx.font = "10px Helvetica";
  ctx.fillStyle = rgb(C.muted);
  ctx.fillText("comments", cx, cy + 12);

  // Legend
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  let ly = 40;
  data.forEach((d) => {
    ctx.fillStyle = rgb(d.color);
    ctx.fillRect(215, ly - 6, 12, 12);
    ctx.fillStyle = rgb(C.text);
    ctx.font = "bold 11px Helvetica";
    const pct = Math.round((d.value / total) * 100);
    ctx.fillText(`${d.label}`, 232, ly);
    ctx.font = "10px Helvetica";
    ctx.fillStyle = rgb(C.muted);
    ctx.fillText(`${d.value} (${pct}%)`, 232, ly + 14);
    ly += 36;
  });

  return canvas.toDataURL("image/png");
}

function drawHBar(data: { label: string; value: number; color?: [number, number, number] }[], w = 500, h?: number): string {
  const rows = data.length;
  const rowH = 26;
  const height = h || Math.max(60, rows * rowH + 20);
  const { canvas, ctx } = makeCanvas(w, height);
  const max = Math.max(1, ...data.map((d) => d.value));
  const labelW = 140;
  const barMax = w - labelW - 60;

  data.forEach((d, i) => {
    const y = 12 + i * rowH;
    // Label
    ctx.fillStyle = rgb(C.text);
    ctx.font = "11px Helvetica";
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    const label = clean(d.label).slice(0, 22);
    ctx.fillText(label, labelW - 8, y + 8);
    // Track
    ctx.fillStyle = rgb(C.border, 0.5);
    ctx.fillRect(labelW, y, barMax, 14);
    // Bar
    const bw = (d.value / max) * barMax;
    ctx.fillStyle = rgb(d.color || C.primary);
    ctx.fillRect(labelW, y, bw, 14);
    // Value
    ctx.fillStyle = rgb(C.text);
    ctx.font = "bold 10px Helvetica";
    ctx.textAlign = "left";
    ctx.fillText(String(d.value), labelW + bw + 6, y + 8);
  });

  return canvas.toDataURL("image/png");
}

/* ─── Main report ─── */

export function generatePdfReport(result: AnalysisResult): void {
  const doc = new jsPDF({ unit: "pt", format: "letter" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const margin = 48;
  let y = margin;

  const ensureSpace = (need: number) => {
    if (y + need > pageH - margin - 24) {
      doc.addPage();
      y = margin;
    }
  };

  /* ── Cover ── */
  doc.setFillColor(...C.primary);
  doc.rect(0, 0, pageW, 140, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.text("COMMENT INSIGHTS", margin, 42);
  doc.setFontSize(28);
  const title = doc.splitTextToSize(clean(result.video.title || "Untitled"), pageW - margin * 2);
  doc.text(title.slice(0, 2), margin, 74);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.text(clean(result.video.channelTitle || ""), margin, 118);

  y = 170;
  doc.setTextColor(...C.muted);
  doc.setFontSize(9);
  doc.text(
    `Generated ${new Date().toLocaleString()}`,
    pageW - margin,
    170,
    { align: "right" }
  );

  /* ── KPI cards ── */
  const total = result.totalAnalyzed || 1;
  const posPct = Math.round((result.sentiment.positive / total) * 100);
  const negPct = Math.round((result.sentiment.negative / total) * 100);
  const kpis = [
    { label: "Comments Analyzed", value: String(result.totalAnalyzed), tint: C.primary },
    { label: "Positive", value: `${posPct}%`, tint: C.positive },
    { label: "Negative", value: `${negPct}%`, tint: C.negative },
    { label: "Topics Detected", value: String(result.topics?.length || 0), tint: C.accent },
  ];
  const cardW = (pageW - margin * 2 - 24) / 4;
  y += 12;
  kpis.forEach((k, i) => {
    const x = margin + i * (cardW + 8);
    doc.setDrawColor(...C.border);
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, y, cardW, 72, 6, 6, "FD");
    doc.setFillColor(...k.tint);
    doc.roundedRect(x, y, cardW, 4, 2, 2, "F");
    doc.setTextColor(...C.text);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text(k.value, x + 12, y + 40);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(clean(k.label), x + 12, y + 58);
  });
  y += 92;

  /* ── Section helper ── */
  const section = (label: string) => {
    ensureSpace(38);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.setTextColor(...C.primary);
    doc.text(clean(label).toUpperCase(), margin, y);
    y += 8;
    doc.setDrawColor(...C.primary);
    doc.setLineWidth(1.2);
    doc.line(margin, y, margin + 40, y);
    doc.setLineWidth(0.5);
    doc.setDrawColor(...C.border);
    doc.line(margin + 40, y, pageW - margin, y);
    y += 14;
    doc.setTextColor(...C.text);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
  };

  const paragraph = (text: string) => {
    const lines = doc.splitTextToSize(clean(text), pageW - margin * 2);
    ensureSpace(lines.length * 13 + 4);
    doc.text(lines, margin, y);
    y += lines.length * 13 + 6;
  };

  const bulletList = (items: string[]) => {
    items.forEach((item) => {
      const text = clean(item);
      if (!text) return;
      const lines = doc.splitTextToSize(`- ${text}`, pageW - margin * 2 - 12);
      ensureSpace(lines.length * 13 + 2);
      doc.text(lines, margin + 6, y);
      y += lines.length * 13 + 2;
    });
    y += 6;
  };

  /* ── Executive Summary ── */
  if (result.insights?.summary) {
    section("Executive Summary");
    paragraph(result.insights.summary);
  }

  /* ── Sentiment donut ── */
  section("Sentiment Overview");
  const donutPng = drawDonut([
    { label: "Positive", value: result.sentiment.positive, color: C.positive },
    { label: "Neutral", value: result.sentiment.neutral, color: C.neutral },
    { label: "Negative", value: result.sentiment.negative, color: C.negative },
  ]);
  ensureSpace(180);
  doc.addImage(donutPng, "PNG", margin, y, 320, 180);
  // Interpretation text next to donut
  const interpX = margin + 340;
  const interpW = pageW - interpX - margin;
  let interp = "";
  if (posPct >= 70) interp = "Overwhelmingly positive reception. Viewers are engaged and enthusiastic — a strong signal to double down on this content style.";
  else if (posPct >= 50) interp = "Generally favorable response. Positive sentiment leads, but a meaningful minority raises concerns worth reviewing.";
  else if (negPct >= 40) interp = "Notable negative sentiment. Review the complaints section and next steps closely before publishing similar content.";
  else interp = "Mixed reception. Sentiment is spread across all three buckets — consider what viewers highlight as likes vs. dislikes.";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...C.text);
  doc.text("What this means", interpX, y + 20);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  const interpLines = doc.splitTextToSize(interp, interpW);
  doc.text(interpLines, interpX, y + 38);
  y += 190;

  /* ── Top Topics bar chart ── */
  if (result.topics?.length) {
    section("Top Topics");
    const topics = result.topics.slice(0, 8).map((t) => ({ label: t.topic, value: t.count, color: C.primary }));
    const png = drawHBar(topics, 500, topics.length * 26 + 20);
    const imgH = topics.length * 26 + 20;
    ensureSpace(imgH + 8);
    doc.addImage(png, "PNG", margin, y, pageW - margin * 2, (imgH * (pageW - margin * 2)) / 500);
    y += (imgH * (pageW - margin * 2)) / 500 + 12;
  }

  /* ── Categories bar chart ── */
  const catEntries = Object.entries(result.categories || {})
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);
  if (catEntries.length) {
    section("Comment Categories");
    const cats = catEntries.slice(0, 8).map(([k, v], i) => ({
      label: k, value: v, color: CATEGORY_PALETTE[i % CATEGORY_PALETTE.length],
    }));
    const imgH = cats.length * 26 + 20;
    const png = drawHBar(cats, 500, imgH);
    ensureSpace(imgH * ((pageW - margin * 2) / 500) + 8);
    doc.addImage(png, "PNG", margin, y, pageW - margin * 2, imgH * ((pageW - margin * 2) / 500));
    y += imgH * ((pageW - margin * 2) / 500) + 12;
  }

  /* ── Likes / Dislikes / Complaints ── */
  const insightBlocks: [string, string[] | undefined][] = [
    ["What Viewers Loved", result.insights?.likes],
    ["What Viewers Disliked", result.insights?.dislikes],
    ["Common Complaints", result.insights?.complaints],
    ["Recommendations", result.insights?.recommendations],
  ];
  insightBlocks.forEach(([label, items]) => {
    if (items && items.length) {
      section(label);
      bulletList(items);
    }
  });

  /* ── Next Steps ── */
  if (result.insights?.nextSteps?.length) {
    section("Prioritized Next Steps");
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Priority", "Action", "Rationale"]],
      body: result.insights.nextSteps.map((n) => [
        clean(n.priority).toUpperCase(),
        clean(n.action),
        clean(n.rationale),
      ]),
      headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 7, textColor: C.text, valign: "top", lineColor: C.border, lineWidth: 0.5 },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: {
        0: { cellWidth: 60, fontStyle: "bold", halign: "center" },
        1: { cellWidth: 170 },
      },
      didParseCell: (data) => {
        if (data.section === "body" && data.column.index === 0) {
          const v = String(data.cell.raw).toLowerCase();
          if (v === "high") data.cell.styles.textColor = C.negative;
          else if (v === "medium") data.cell.styles.textColor = [234, 179, 8];
          else data.cell.styles.textColor = C.positive;
        }
      },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  /* ── Moments that mattered (timeline hotspots) ── */
  const tl = (result as any).timeline as import("@/types/analysis").Timeline | undefined;
  if (tl?.hasTranscript && tl.hotspots?.length) {
    ensureSpace(40);
    section("Moments That Mattered");
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...C.muted);
    doc.text(
      `Comments referencing specific timestamps, mapped to the video transcript. ${Object.keys(tl.commentTimestamps).length} timestamped, ${tl.unmappedCount} general.`,
      margin, y,
    );
    y += 14;

    const fmtTs = (s: number) => {
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const ss = Math.floor(s % 60);
      return h > 0
        ? `${h}:${String(m).padStart(2, "0")}:${String(ss).padStart(2, "0")}`
        : `${m}:${String(ss).padStart(2, "0")}`;
    };
    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Time", "What was said", "Reactions", "Suggestion"]],
      body: tl.hotspots.slice(0, 8).map((h) => [
        `${fmtTs(h.start)}-${fmtTs(h.end)}`,
        clean(h.transcript).slice(0, 220),
        `+${h.sentiment.positive} / -${h.sentiment.negative} / ~${h.sentiment.neutral}\n(${h.commentIndices.length} comments)`,
        clean(h.suggestion),
      ]),
      headStyles: { fillColor: C.primary, textColor: [255, 255, 255], fontStyle: "bold", fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 6, textColor: C.text, valign: "top", overflow: "linebreak", lineColor: C.border, lineWidth: 0.4 },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: {
        0: { cellWidth: 64, fontStyle: "bold", halign: "center" },
        2: { cellWidth: 78, halign: "center", fontSize: 8 },
      },
    });
    y = (doc as any).lastAutoTable.finalY + 16;
  }

  /* ── Top comments by category (top 10 each) with AI replies ── */
  doc.addPage();
  y = margin;

  section("Top Comments by Category");
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(...C.muted);
  doc.text("Top 10 comments per category, ranked by likes. AI-generated replies are included where available.", margin, y);
  y += 16;

  // Group comments by category
  const byCategory = new Map<string, typeof result.comments>();
  (result.comments || []).forEach((c) => {
    const cat = c.category || "General";
    if (!byCategory.has(cat)) byCategory.set(cat, []);
    byCategory.get(cat)!.push(c);
  });

  // Order categories to match the categories chart order
  const catOrder = catEntries.length
    ? catEntries.map(([k]) => k).filter((k) => byCategory.has(k))
    : Array.from(byCategory.keys());
  // Append any leftover
  Array.from(byCategory.keys()).forEach((k) => {
    if (!catOrder.includes(k)) catOrder.push(k);
  });

  catOrder.forEach((cat, catIdx) => {
    const list = byCategory.get(cat) || [];
    if (!list.length) return;
    const top10 = [...list].sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0)).slice(0, 10);

    ensureSpace(50);
    // Category header pill
    const color = CATEGORY_PALETTE[catIdx % CATEGORY_PALETTE.length];
    doc.setFillColor(...color);
    doc.roundedRect(margin, y, 200, 20, 4, 4, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(`${clean(cat).toUpperCase()}  (${list.length})`, margin + 10, y + 13);
    y += 28;

    const body = top10.map((c) => {
      const cached = getAllCachedReplies(c.text, result.video?.title);
      const tones = Object.keys(cached);
      let reply = "";
      if (tones.length) {
        // Prefer friendly, else first available; take first reply of that tone
        const preferred = tones.includes("friendly") ? "friendly" : tones[0];
        const arr = cached[preferred] || [];
        if (arr[0]) reply = `[${preferred}] ${arr[0]}`;
      }
      return [
        clean(c.text),
        reply ? clean(reply) : "(no AI reply generated)",
      ];
    });

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Comment", "AI Reply"]],
      body,
      headStyles: { fillColor: C.headerBg, textColor: C.text, fontStyle: "bold", fontSize: 9 },
      styles: {
        fontSize: 9,
        cellPadding: 6,
        textColor: C.text,
        valign: "top",
        overflow: "linebreak",
        font: "helvetica",
        lineColor: C.border,
        lineWidth: 0.4,
      },
      alternateRowStyles: { fillColor: C.altRow },
      columnStyles: {
        0: { cellWidth: (pageW - margin * 2) * 0.45 },
        1: { cellWidth: (pageW - margin * 2) * 0.55, textColor: C.muted, fontStyle: "italic" },
      },
      didDrawPage: () => { y = margin; },
    });
    y = (doc as any).lastAutoTable.finalY + 18;
  });

  /* ── Footer on every page ── */
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...C.border);
    doc.line(margin, pageH - 30, pageW - margin, pageH - 30);
    doc.setFontSize(8);
    doc.setTextColor(...C.muted);
    doc.setFont("helvetica", "normal");
    doc.text("Comment Insights - AI-powered YouTube analytics", margin, pageH - 18);
    doc.text(`Page ${i} of ${pageCount}`, pageW - margin, pageH - 18, { align: "right" });
  }

  const filename = `insights-${slug(result.video?.title || "report")}-${new Date().toISOString().slice(0, 10)}.pdf`;
  doc.save(filename);
}
