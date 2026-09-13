# Summit 7.9G timeout diagnosis

7.9F showed a split:

- Successful Groq replies were usually 0.4–1.6 s (GPT-OSS median ~899 ms).
- Many other AI-routed eval calls ended at **exactly 15015 ms**.

That 15.015 s figure matches the **browser/Node `AbortController` on `HttpAdapter`**, not Groq’s successful-completion distribution. The proxy `fetch` to Groq had **no abort signal**. If Groq hung, was slow to start, or the first structured-output mode failed, the proxy could:

1. wait indefinitely on upstream `fetch`
2. then chain `json_schema` → `json_object` → `plain`
3. keep the Groq request running after the client had already disconnected

So the student (or the 15 s eval timeout) aborted locally while Groq work continued. Raising the in-game timeout would only hide the hang. Successful calls were already fast.

7.9G changes (do not raise the student timeout):

- In-game / eval timeout stays **5000 ms**.
- Proxy upstream abort at **~4000 ms** (`SUMMIT_UPSTREAM_TIMEOUT_MS`).
- Extra response modes are skipped if the mode budget (`SUMMIT_MODE_BUDGET_MS`, ~4500 ms) is spent, or if Groq already 504/429’d.
- Client `close`/`aborted` aborts the upstream fetch.
- Game `HttpAdapter` uses `retry429: 0` so a 429 becomes authored fallback instead of a 15–20 s wait.

7.9G live eval (GPT-OSS 20B, 5 s, no 429 backoff): **0 timeouts**. Successful hosted median ~351 ms, p95 ~659 ms. One 429 in pass 1 of this phase was a rate-limit, not a hang; pass 2 with a 1.8 s gap had none.

Not observed as the 7.9F 15 s pattern: schema 400s (those fail fast), Groq TPM 429s (distinct status), or malformed JSON (distinct 502). The long tail was abort + uncancelled upstream.
