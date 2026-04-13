import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, Trash2, ExternalLink } from "lucide-react";
import { getSessionId } from "@/lib/sessionId";
import type { AnalysisResult } from "@/types/analysis";

interface Report {
  id: string;
  video_id: string;
  video_url: string;
  video_title: string | null;
  channel_title: string | null;
  thumbnail: string | null;
  result: AnalysisResult;
  created_at: string;
}

interface ReportHistoryProps {
  onLoad: (result: AnalysisResult) => void;
  refreshKey: number;
}

const ReportHistory = ({ onLoad, refreshKey }: ReportHistoryProps) => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchReports = async () => {
    setLoading(true);
    const sessionId = getSessionId();
    const { data } = await supabase
      .from("analysis_reports")
      .select("*")
      .eq("session_id", sessionId)
      .order("created_at", { ascending: false })
      .limit(10);
    setReports((data as unknown as Report[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, [refreshKey]);

  const deleteReport = async (id: string) => {
    await supabase.from("analysis_reports").delete().eq("id", id).eq("session_id", getSessionId());
    setReports((prev) => prev.filter((r) => r.id !== id));
  };

  const clearAll = async () => {
    const sessionId = getSessionId();
    await supabase.from("analysis_reports").delete().eq("session_id", sessionId);
    setReports([]);
  };

  if (loading) return null;
  if (reports.length === 0) return null;

  return (
    <Card>
      <CardContent className="pt-5 pb-3">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-sm font-medium text-foreground">Recent Reports</h3>
        </div>
        <div className="space-y-2">
          {reports.map((r) => (
            <div
              key={r.id}
              className="flex items-center gap-3 p-2 rounded-md hover:bg-accent cursor-pointer group transition-colors"
              onClick={() => onLoad(r.result)}
            >
              {r.thumbnail && (
                <img src={r.thumbnail} alt="" className="w-16 h-9 rounded object-cover shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{r.video_title || r.video_url}</p>
                <p className="text-xs text-muted-foreground">
                  {r.channel_title && `${r.channel_title} · `}
                  {new Date(r.created_at).toLocaleDateString()}
                </p>
              </div>
              <ExternalLink className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default ReportHistory;
