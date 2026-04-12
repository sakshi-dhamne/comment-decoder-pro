import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Video, Clapperboard, Users, Radio, HelpCircle, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import type { ContentIdea, FAQ } from "@/types/analysis";

interface ContentIdeasProps {
  contentIdeas?: ContentIdea[];
  faqs?: FAQ[];
}

const typeIcons: Record<string, typeof Video> = {
  video: Video,
  short: Clapperboard,
  community_post: Users,
  live_stream: Radio,
};

const typeLabels: Record<string, string> = {
  video: "Video",
  short: "Short",
  community_post: "Community Post",
  live_stream: "Live Stream",
};

const ContentIdeas = ({ contentIdeas, faqs }: ContentIdeasProps) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* Content Ideas */}
      {contentIdeas && contentIdeas.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Video className="w-4 h-4 text-primary" />
            Content Ideas from Your Audience
          </h3>
          <div className="grid gap-3">
            {contentIdeas.map((idea, i) => {
              const Icon = typeIcons[idea.type] || Video;
              return (
                <Card key={i} className="hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 shrink-0">
                        <Icon className="w-4 h-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-sm font-medium text-foreground">{idea.title}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">{typeLabels[idea.type] || idea.type}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">{idea.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* FAQs */}
      {faqs && faqs.length > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-primary" />
            Frequently Asked Questions
          </h3>
          <div className="space-y-2">
            {faqs.map((faq, i) => (
              <Card
                key={i}
                className="cursor-pointer hover:border-primary/30 transition-colors"
                onClick={() => setExpandedFaq(expandedFaq === i ? null : i)}
              >
                <CardContent className="py-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{faq.question}</p>
                      {expandedFaq === i && (
                        <p className="text-xs text-muted-foreground mt-2 leading-relaxed border-t border-border pt-2">
                          {faq.answer}
                        </p>
                      )}
                    </div>
                    {expandedFaq === i ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {(!contentIdeas || contentIdeas.length === 0) && (!faqs || faqs.length === 0) && (
        <p className="text-sm text-muted-foreground text-center py-8">No content ideas available for this analysis.</p>
      )}
    </div>
  );
};

export default ContentIdeas;
