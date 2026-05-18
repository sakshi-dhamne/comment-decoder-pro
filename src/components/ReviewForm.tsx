import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, ExternalLink } from "lucide-react";

const GOOGLE_FORM_EMBED_URL =
  "https://docs.google.com/forms/d/e/1FAIpQLSdPuYeyZ-eV8f0xnOTxpmFufFM1Jfli73_pJwC0N1qbwyy0WQ/viewform?embedded=true";

const GOOGLE_FORM_DIRECT_URL =
  "https://forms.gle/gYxhzyrXGxZp2pQUA";

export default function ReviewForm() {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="mt-8">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          Feedback
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Have suggestions or found a bug? Let me know — your feedback helps improve this tool.
        </p>

        {!expanded ? (
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setExpanded(true)}>
              Open Review Form
            </Button>
            <Button size="sm" variant="outline" asChild>
              <a
                href={GOOGLE_FORM_DIRECT_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" />
                Open in new tab
              </a>
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="relative w-full overflow-hidden rounded-md border border-border" style={{ height: 500 }}>
              <iframe
                src={GOOGLE_FORM_EMBED_URL}
                title="Review Form"
                className="absolute inset-0 w-full h-full"
                frameBorder={0}
                marginHeight={0}
                marginWidth={0}
              >
                Loading…
              </iframe>
            </div>
            <Button size="sm" variant="ghost" onClick={() => setExpanded(false)}>
              Close form
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
