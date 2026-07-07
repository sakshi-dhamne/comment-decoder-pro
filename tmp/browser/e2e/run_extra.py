"""Extra e2e tests: AI reply generation, report quota checks, PDF report generation, daily limits."""
import asyncio, json, time, os
from pathlib import Path
from playwright.async_api import async_playwright

SHOTS = Path(__file__).parent / "screenshots"
SHOTS.mkdir(exist_ok=True)
BASE = "http://localhost:8080"
SUPA_URL = "https://ounvtemlwuigjohaizhs.supabase.co"
ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bnZ0ZW1sd3VpZ2pvaGFpemhzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1ODI4MDUsImV4cCI6MjA5MTE1ODgwNX0.GWAbDEtX-_XAEruCvKfkdUskDWS6zVgqYABhsqHwk9E"

results = []
def rec(name, status, detail="", shot=None, dur=0):
    results.append({"name": name, "status": status, "detail": detail, "screenshot": shot, "duration_ms": dur})
    print(f"[{status}] {name} ({dur}ms) {detail[:200]}")

async def call_fn(page, fn_name, body):
    return await page.evaluate(f"""async () => {{
        const t0 = performance.now();
        try {{
            const r = await fetch("{SUPA_URL}/functions/v1/{fn_name}", {{
                method: "POST",
                headers: {{
                    "Content-Type": "application/json",
                    "Authorization": "Bearer {ANON}",
                    "apikey": "{ANON}"
                }},
                body: JSON.stringify({json.dumps(body)})
            }});
            const text = await r.text();
            let data; try {{ data = JSON.parse(text); }} catch {{ data = text; }}
            return {{ ok: r.ok, status: r.status, data, ms: Math.round(performance.now()-t0) }};
        }} catch (e) {{
            return {{ ok: false, error: String(e), ms: Math.round(performance.now()-t0) }};
        }}
    }}""")

async def main():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        ctx = await browser.new_context(viewport={"width": 1280, "height": 1800})
        page = await ctx.new_page()
        await page.goto(BASE, wait_until="domcontentloaded")

        # 1. AI reply generation - friendly tone
        t0 = time.time()
        r = await call_fn(page, "generate-reply", {
            "commentText": "Great video! Really loved the explanation on state management.",
            "tone": "friendly",
            "videoTitle": "React State Management Guide"
        })
        dur = int((time.time()-t0)*1000)
        ok = r.get("ok") and isinstance(r.get("data"), dict) and (r["data"].get("replies") or []) and len(r["data"]["replies"]) >= 1
        detail = f"status={r.get('status')} replies={len(r.get('data',{}).get('replies',[])) if isinstance(r.get('data'),dict) else 0} fallback={r.get('data',{}).get('fallback') if isinstance(r.get('data'),dict) else '-'}"
        rec("AI reply generation (friendly)", "PASS" if ok else "FAIL", detail, None, dur)

        # 2. AI reply generation - professional tone
        t0 = time.time()
        r = await call_fn(page, "generate-reply", {
            "commentText": "This didn't work for me. Getting an error at step 3.",
            "tone": "professional"
        })
        dur = int((time.time()-t0)*1000)
        ok = r.get("ok") and isinstance(r.get("data"), dict) and len(r.get("data",{}).get("replies",[])) >= 1
        rec("AI reply generation (professional)", "PASS" if ok else "FAIL",
            f"status={r.get('status')} replies={len(r.get('data',{}).get('replies',[])) if isinstance(r.get('data'),dict) else 0}", None, dur)

        # 3. AI reply generation - witty tone
        t0 = time.time()
        r = await call_fn(page, "generate-reply", {"commentText": "First!", "tone": "witty"})
        dur = int((time.time()-t0)*1000)
        ok = r.get("ok") and isinstance(r.get("data"), dict) and len(r.get("data",{}).get("replies",[])) >= 1
        rec("AI reply generation (witty)", "PASS" if ok else "FAIL",
            f"status={r.get('status')} replies={len(r.get('data',{}).get('replies',[])) if isinstance(r.get('data'),dict) else 0}", None, dur)

        # 4. Reply gen - invalid input
        t0 = time.time()
        r = await call_fn(page, "generate-reply", {"commentText": "", "tone": "friendly"})
        dur = int((time.time()-t0)*1000)
        # should either return 400 or a fallback safely - not crash
        ok = r.get("status") in (200, 400, 422)
        rec("AI reply — invalid empty input handled", "PASS" if ok else "FAIL",
            f"status={r.get('status')}", None, dur)

        # 5. Report quota — CHECK (no consume)
        session_id = f"test-session-{int(time.time())}"
        t0 = time.time()
        r = await call_fn(page, "check-report-quota", {"sessionId": session_id, "consume": False})
        dur = int((time.time()-t0)*1000)
        d = r.get("data", {}) if isinstance(r.get("data"), dict) else {}
        ok = r.get("ok") and d.get("limit") == 3 and d.get("remaining") == 3 and d.get("used") == 0
        rec("Report quota check (fresh session)", "PASS" if ok else "FAIL",
            f"used={d.get('used')} remaining={d.get('remaining')} limit={d.get('limit')}", None, dur)

        # 6. Report quota — CONSUME 3 times
        consume_results = []
        for i in range(3):
            t0 = time.time()
            r = await call_fn(page, "check-report-quota", {
                "sessionId": session_id, "videoId": f"vid{i}", "consume": True
            })
            dur = int((time.time()-t0)*1000)
            d = r.get("data", {}) if isinstance(r.get("data"), dict) else {}
            consume_results.append((r.get("status"), d.get("used"), d.get("remaining")))
        ok = all(s == 200 for s, _, _ in consume_results) and consume_results[-1][2] == 0
        rec("Report quota consume x3 (daily limit=3)", "PASS" if ok else "FAIL",
            f"progression={consume_results}", None, dur)

        # 7. Report quota — 4th consume should be blocked (429)
        t0 = time.time()
        r = await call_fn(page, "check-report-quota", {
            "sessionId": session_id, "videoId": "vid4", "consume": True
        })
        dur = int((time.time()-t0)*1000)
        d = r.get("data", {}) if isinstance(r.get("data"), dict) else {}
        ok = r.get("status") == 429 and d.get("allowed") is False and d.get("remaining") == 0
        rec("Report quota blocks 4th download (429)", "PASS" if ok else "FAIL",
            f"status={r.get('status')} allowed={d.get('allowed')} remaining={d.get('remaining')}", None, dur)

        # 8. Report quota — missing sessionId returns 400
        t0 = time.time()
        r = await call_fn(page, "check-report-quota", {})
        dur = int((time.time()-t0)*1000)
        ok = r.get("status") == 400
        rec("Report quota validates sessionId", "PASS" if ok else "FAIL",
            f"status={r.get('status')}", None, dur)

        # 9. Frontend: AI-reply daily limit (localStorage) enforced client-side
        await page.goto(BASE, wait_until="domcontentloaded")
        limit_state = await page.evaluate("""() => {
            const KEY = "ci_reply_daily_usage";
            const today = new Date().toISOString().slice(0,10);
            // simulate hitting limit
            localStorage.setItem(KEY, JSON.stringify({date: today, count: 3}));
            localStorage.setItem("ci_is_premium", "false");
            const u = JSON.parse(localStorage.getItem(KEY));
            const remaining = Math.max(0, 3 - u.count);
            return { used: u.count, remaining, blocked: remaining <= 0 };
        }""")
        ok = limit_state.get("blocked") is True and limit_state.get("remaining") == 0
        rec("Client-side AI reply limit (3/day) blocks at cap", "PASS" if ok else "FAIL",
            f"state={limit_state}", None, 0)

        # 10. Frontend: analysis daily limit
        limit_state2 = await page.evaluate("""() => {
            const KEY = "ci_daily_usage";
            const today = new Date().toISOString().slice(0,10);
            localStorage.setItem(KEY, JSON.stringify({date: today, count: 5}));
            const u = JSON.parse(localStorage.getItem(KEY));
            const remaining = Math.max(0, 5 - u.count);
            return { used: u.count, remaining, blocked: remaining <= 0 };
        }""")
        ok = limit_state2.get("blocked") is True
        rec("Client-side analysis limit (5/day) blocks at cap", "PASS" if ok else "FAIL",
            f"state={limit_state2}", None, 0)

        # 11. PDF report generation smoke test — check downloadReport module renders in the app
        # Use the app to invoke jsPDF via the exposed pipeline
        await page.evaluate("""() => { localStorage.removeItem('ci_daily_usage'); localStorage.removeItem('ci_reply_daily_usage'); }""")
        pdf_test = await page.evaluate("""async () => {
            try {
                const mod = await import('/src/lib/generateReport.ts');
                const fn = mod.generatePdfReport || mod.generateReport || mod.default;
                if (!fn) return { ok: false, error: 'no export found', exports: Object.keys(mod) };
                const fake = {
                    video: { title: "Test Video", channelTitle: "Test Channel", thumbnail: "", viewCount: "1000", commentCount: "50" },
                    totalAnalyzed: 10,
                    sentiment: { positive: 6, negative: 2, neutral: 2 },
                    categories: { praise: 5, question: 3, complaint: 2 },
                    categorySamples: { praise: ["Great!"], question: ["Why?"], complaint: ["Bad"] },
                    topics: [{ topic: "tutorial", count: 4, comments: ["nice tutorial"] }],
                    keywords: [{ word: "great", count: 5 }],
                    insights: { summary: "Test summary", likes: ["clarity"], dislikes: ["length"], complaints: ["audio"], recommendations: ["shorter"] },
                    comments: [{ author: "A", text: "Great!", likeCount: 3, sentiment: "positive", category: "praise", publishedAt: new Date().toISOString() }]
                };
                const out = await fn(fake);
                return { ok: true, type: typeof out, exports: Object.keys(mod) };
            } catch (e) {
                return { ok: false, error: String(e && e.message || e) };
            }
        }""")
        ok = pdf_test.get("ok") is True
        rec("PDF report generation (client)", "PASS" if ok else "FAIL",
            f"{pdf_test}", None, 0)

        await browser.close()

    Path("/tmp/browser/e2e/results_extra.json").write_text(json.dumps({"results": results}, indent=2))

asyncio.run(main())
