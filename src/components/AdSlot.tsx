import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ExternalLink, Sparkles } from "lucide-react";
import { Card } from "@/components/ui/card";
import { trackAdEvent, isPremium } from "@/lib/usageTracking";
import { ADSENSE_CLIENT, ADSENSE_SLOTS, pushAd } from "@/lib/adsense";
import { FEATURE_USAGE_LIMITS } from "@/lib/featureFlags";

interface AdSlotProps {
  slot: string;
  variant?: "banner" | "native";
  /** Optional: pass real ad provider props later (e.g., AdSense slot ID). */
  adsenseSlotId?: string;
}

// Curated rotating sponsored promos. All advertise paid/external offerings —
// never features the free tier already has. Replace with real ad-network markup
// (e.g., AdSense <ins> + adsbygoogle.push) when publisher ID is available.
const PROMOS = [
  {
    title: "Pro: Unlimited Analyses",
    body: "Remove daily limits, unlock deeper AI models, and hide all ads.",
    cta: "Upgrade",
    href: "#upgrade",
  },
  {
    title: "Pro: Bulk Video Reports",
    body: "Analyze 10+ videos at once and export branded PDF reports.",
    cta: "Go Pro",
    href: "#upgrade",
  },
  {
    title: "Pro: API Access",
    body: "Integrate Comment Insights into your own pipeline via REST API.",
    cta: "Join waitlist",
    href: "#upgrade",
  },
];

const AdSlot = ({ slot, variant = "native" }: AdSlotProps) => {
  const ref = useRef<HTMLDivElement | null>(null);
  const seen = useRef(false);

  // Hide ads entirely for premium users — keeps logic ready for paid tier.
  if (isPremium()) return null;

  const adsenseSlotId = ADSENSE_SLOTS[slot];
  const promo = PROMOS[Math.abs(hash(slot)) % PROMOS.length];

  // Track impression once when at least 50% visible.
  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && !seen.current) {
            seen.current = true;
            trackAdEvent(slot, "impression");
          }
        });
      },
      { threshold: 0.5 }
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, [slot]);

  const handleClick = () => trackAdEvent(slot, "click");

  // Real AdSense unit when a slot ID is configured for this placement.
  if (adsenseSlotId) {
    return (
      <AdsenseUnit
        ref={ref}
        slot={slot}
        slotId={adsenseSlotId}
        format={variant === "banner" ? "horizontal" : "fluid"}
        onClick={handleClick}
      />
    );
  }

  // No real ad configured for this slot. The "Go Pro" sponsored fallback
  // is part of the upsell flow and stays hidden unless usage-limits flag is on.
  if (!FEATURE_USAGE_LIMITS) return null;

  if (variant === "banner") {
    return (
      <motion.div
        ref={ref}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="w-full"
      >
        <a
          href={promo.href}
          onClick={handleClick}
          className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-md border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-sm"
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70 font-medium shrink-0">
              Sponsored
            </span>
            <span className="text-foreground truncate">
              <span className="font-medium">{promo.title}</span>
              <span className="text-muted-foreground"> — {promo.body}</span>
            </span>
          </div>
          <span className="text-primary text-xs font-medium flex items-center gap-1 shrink-0">
            {promo.cta} <ExternalLink className="w-3 h-3" />
          </span>
        </a>
      </motion.div>
    );
  }

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="bg-gradient-to-br from-primary/5 to-transparent border-primary/20">
        <a
          href={promo.href}
          onClick={handleClick}
          className="flex items-center gap-4 p-4 hover:bg-primary/[0.03] transition-colors rounded-lg"
        >
          <div className="p-2.5 rounded-md bg-primary/10 shrink-0">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold text-foreground truncate">{promo.title}</p>
              <span className="text-[9px] uppercase tracking-wider text-muted-foreground/70 px-1.5 py-0.5 rounded bg-muted">
                Sponsored
              </span>
            </div>
            <p className="text-xs text-muted-foreground">{promo.body}</p>
          </div>
          <span className="text-primary text-xs font-medium flex items-center gap-1 shrink-0">
            {promo.cta} <ExternalLink className="w-3 h-3" />
          </span>
        </a>
      </Card>
    </motion.div>
  );
};

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

interface AdsenseUnitProps {
  slot: string;
  slotId: string;
  format: "horizontal" | "fluid" | "auto";
  onClick: () => void;
  ref: React.RefObject<HTMLDivElement | null>;
}

const AdsenseUnit = ({ ref, slot, slotId, format, onClick }: AdsenseUnitProps) => {
  useEffect(() => {
    pushAd();
  }, [slotId]);

  return (
    <div ref={ref} onClick={onClick} className="w-full" data-ad-slot-name={slot}>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={ADSENSE_CLIENT}
        data-ad-slot={slotId}
        data-ad-format={format === "horizontal" ? "horizontal" : "auto"}
        data-full-width-responsive="true"
      />
    </div>
  );
};

export default AdSlot;
