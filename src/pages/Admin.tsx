import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { Lock, RefreshCw, ShieldAlert } from "lucide-react";

const STORAGE_KEY = "ci_admin_passcode";

interface SessionRow {
  session_id: string;
  replies_total: number;
  replies_fallback: number;
  replies_error: number;
  downloads_total: number;
  downloads_blocked: number;
  last_activity: string;
}
interface ReplyRow {
  id: string;
  session_id: string;
  video_id: string | null;
  tone: string;
  status: string;
  fallback: boolean;
  comment_preview: string | null;
  error_message: string | null;
  created_at: string;
}
interface DownloadRow {
  id: string;
  session_id: string;
  video_id: string | null;
  status: string;
  blocked_reason: string | null;
  downloaded_at: string;
}
interface UsageResponse {
  replies: ReplyRow[];
  downloads: DownloadRow[];
  sessions: SessionRow[];
}

const fmt = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const short = (s: string) => (s.length > 12 ? `${s.slice(0, 8)}…${s.slice(-4)}` : s);

const StatusBadge = ({ status, fallback }: { status: string; fallback?: boolean }) => {
  if (status === "success" && !fallback) return <Badge variant="default">success</Badge>;
  if (fallback) return <Badge variant="secondary">fallback</Badge>;
  if (status === "blocked") return <Badge variant="destructive">blocked</Badge>;
  if (status === "error") return <Badge variant="destructive">error</Badge>;
  return <Badge variant="outline">{status}</Badge>;
};

const Admin = () => {
  const { toast } = useToast();
  const [passcode, setPasscode] = useState<string>(
    () => localStorage.getItem(STORAGE_KEY) ?? "",
  );
  const [authed, setAuthed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<UsageResponse | null>(null);
  const [filter, setFilter] = useState("");

  const load = async (code: string) => {
    setLoading(true);
    try {
      const { data: res, error } = await supabase.functions.invoke("admin-usage", {
        headers: { "x-admin-passcode": code },
      });
      if (error) {
        const status = (error as { context?: { status?: number } }).context?.status;
        if (status === 401) {
          toast({ title: "Incorrect passcode", variant: "destructive" });
          setAuthed(false);
          localStorage.removeItem(STORAGE_KEY);
          return;
        }
        throw new Error(error.message);
      }
      if ((res as { error?: string })?.error) throw new Error((res as { error?: string }).error);
      setData(res as UsageResponse);
      setAuthed(true);
      localStorage.setItem(STORAGE_KEY, code);
    } catch (e) {
      toast({
        title: "Failed to load",
        description: (e as Error).message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (passcode) load(passcode);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.title = "Admin – Usage History";
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement("meta");
      meta.setAttribute("name", "description");
      document.head.appendChild(meta);
    }
    meta.setAttribute(
      "content",
      "Admin dashboard for AI reply and report download usage history.",
    );
    let robots = document.querySelector('meta[name="robots"]');
    if (!robots) {
      robots = document.createElement("meta");
      robots.setAttribute("name", "robots");
      document.head.appendChild(robots);
    }
    robots.setAttribute("content", "noindex,nofollow");
  }, []);

  if (!authed) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-background p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lock className="h-5 w-5" /> Admin access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Enter the admin passcode to view per-session usage history.
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (passcode) load(passcode);
              }}
            >
              <Input
                type="password"
                value={passcode}
                onChange={(e) => setPasscode(e.target.value)}
                placeholder="Admin passcode"
                autoFocus
              />
              <Button type="submit" disabled={loading || !passcode}>
                {loading ? "Checking…" : "Unlock"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    );
  }

  const sessions = (data?.sessions ?? []).filter((s) =>
    filter ? s.session_id.toLowerCase().includes(filter.toLowerCase()) : true,
  );
  const replies = (data?.replies ?? []).filter((r) =>
    filter ? r.session_id.toLowerCase().includes(filter.toLowerCase()) : true,
  );
  const downloads = (data?.downloads ?? []).filter((d) =>
    filter ? d.session_id.toLowerCase().includes(filter.toLowerCase()) : true,
  );

  const totals = {
    sessions: data?.sessions.length ?? 0,
    replies: data?.replies.length ?? 0,
    downloads: data?.downloads.length ?? 0,
    blocked:
      (data?.replies.filter((r) => r.status === "error" || r.fallback).length ?? 0) +
      (data?.downloads.filter((d) => d.status !== "success").length ?? 0),
  };

  return (
    <main className="min-h-screen bg-background p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">Admin · Usage History</h1>
            <p className="text-sm text-muted-foreground">
              Per-session AI reply and report download activity.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Input
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              placeholder="Filter by session id"
              className="w-64"
            />
            <Button
              variant="outline"
              size="icon"
              onClick={() => load(passcode)}
              disabled={loading}
              aria-label="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                localStorage.removeItem(STORAGE_KEY);
                setAuthed(false);
                setPasscode("");
                setData(null);
              }}
            >
              Sign out
            </Button>
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[
            { label: "Sessions", value: totals.sessions },
            { label: "AI replies", value: totals.replies },
            { label: "Report events", value: totals.downloads },
            { label: "Blocked / fallback", value: totals.blocked },
          ].map((k) => (
            <Card key={k.label}>
              <CardContent className="p-4">
                <div className="text-xs uppercase text-muted-foreground">{k.label}</div>
                <div className="text-2xl font-semibold">{k.value}</div>
              </CardContent>
            </Card>
          ))}
        </section>

        <Tabs defaultValue="sessions">
          <TabsList>
            <TabsTrigger value="sessions">Sessions</TabsTrigger>
            <TabsTrigger value="replies">AI Replies</TabsTrigger>
            <TabsTrigger value="downloads">Report Downloads</TabsTrigger>
          </TabsList>

          <TabsContent value="sessions">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Session</TableHead>
                      <TableHead className="text-right">Replies</TableHead>
                      <TableHead className="text-right">Fallback</TableHead>
                      <TableHead className="text-right">Errors</TableHead>
                      <TableHead className="text-right">Downloads</TableHead>
                      <TableHead className="text-right">Blocked</TableHead>
                      <TableHead>Last activity</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessions.map((s) => (
                      <TableRow key={s.session_id}>
                        <TableCell className="font-mono text-xs" title={s.session_id}>
                          {short(s.session_id)}
                        </TableCell>
                        <TableCell className="text-right">{s.replies_total}</TableCell>
                        <TableCell className="text-right">{s.replies_fallback}</TableCell>
                        <TableCell className="text-right">{s.replies_error}</TableCell>
                        <TableCell className="text-right">{s.downloads_total}</TableCell>
                        <TableCell className="text-right">
                          {s.downloads_blocked > 0 ? (
                            <span className="inline-flex items-center gap-1 text-destructive">
                              <ShieldAlert className="h-3 w-3" />
                              {s.downloads_blocked}
                            </span>
                          ) : (
                            0
                          )}
                        </TableCell>
                        <TableCell className="text-xs">{fmt(s.last_activity)}</TableCell>
                      </TableRow>
                    ))}
                    {!sessions.length && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                          No sessions yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="replies">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Tone</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Comment</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {replies.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-xs whitespace-nowrap">{fmt(r.created_at)}</TableCell>
                        <TableCell className="font-mono text-xs" title={r.session_id}>{short(r.session_id)}</TableCell>
                        <TableCell className="font-mono text-xs">{r.video_id ?? "—"}</TableCell>
                        <TableCell>{r.tone}</TableCell>
                        <TableCell><StatusBadge status={r.status} fallback={r.fallback} /></TableCell>
                        <TableCell className="max-w-md truncate text-xs text-muted-foreground" title={r.comment_preview ?? ""}>
                          {r.comment_preview ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                    {!replies.length && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                          No AI reply requests yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="downloads">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Session</TableHead>
                      <TableHead>Video</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reason</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {downloads.map((d) => (
                      <TableRow key={d.id}>
                        <TableCell className="text-xs whitespace-nowrap">{fmt(d.downloaded_at)}</TableCell>
                        <TableCell className="font-mono text-xs" title={d.session_id}>{short(d.session_id)}</TableCell>
                        <TableCell className="font-mono text-xs">{d.video_id ?? "—"}</TableCell>
                        <TableCell><StatusBadge status={d.status} /></TableCell>
                        <TableCell className="text-xs text-muted-foreground">{d.blocked_reason ?? "—"}</TableCell>
                      </TableRow>
                    ))}
                    {!downloads.length && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                          No report downloads yet.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
};

export default Admin;
