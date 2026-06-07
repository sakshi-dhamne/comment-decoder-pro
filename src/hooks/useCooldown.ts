import { useEffect, useState } from "react";
import { getCooldownUntil, subscribeCooldown } from "@/lib/rateLimitStore";

export interface CooldownState {
  active: boolean;
  secondsLeft: number;
  until: number;
}

export function useCooldown(): CooldownState {
  const [until, setUntil] = useState<number>(() => getCooldownUntil());
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    return subscribeCooldown(() => setUntil(getCooldownUntil()));
  }, []);

  useEffect(() => {
    if (!until || until <= Date.now()) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [until]);

  const secondsLeft = Math.max(0, Math.ceil((until - now) / 1000));
  return { active: secondsLeft > 0, secondsLeft, until };
}
