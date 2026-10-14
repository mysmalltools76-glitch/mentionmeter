"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { APP_NAME, DEFAULT_OPENAI_MODEL } from "@/lib/config";
import { analyzeAnswer, overallScore, brandTerms, splitHighlights, cleanAnswer } from "@/lib/analyze";

const LOADING_STEPS = [
  "Writing the questions your customers would ask…",
  "Asking Gemini each question…",
  "Reading every answer for your name…",
  "Checking which competitors got named…",
  "Putting your report together…",
];

const SAMPLE = {
  q: "What's the best invoicing tool for a small design studio?",
  a: "For a small studio, Tallyhaus is a strong pick thanks to simple project billing. Numbrly works well if you also need payroll, and Ledgerfox is the cheapest option for solo freelancers.",
};

export default function Home() {
  const [form, setForm] = useState({
    brand: "",
    website: "",
    niche: "",
    competitors: "",
    email: "",
    marketingOk: false,
    hp: "",
  });
  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState(DEFAULT_OPENAI_MODEL);
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [error, setError] = useState("");
  const [step, setStep] = useState(0);
  const [report, setReport] = useState(null);
  const [gpt, setGpt] = useState({ status: "idle", results: [], error: "" });

  useEffect(() => {
    if (status !== "loading") return;
    setStep(0);
    const id = setInterval(() => setStep((s) => Math.min(s + 1, LOADING_STEPS.length - 1)), 6000);
    return () => clearInterval(id);
  }, [status]);

  const set = (k) => (e) =>
    setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  async function onSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    setReport(null);
    setGpt({ status: "idle", results: [], error: "" });
    try {
      const res = await fetch("/api/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "The check failed. Try again.");
      setReport(data);
      setStatus("done");
      if (openaiKey.trim()) runChatGPT(data);
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  // ChatGPT check seedha browser se OpenAI ko jata hai. Key hamare server par kabhi nahi aati.
  async function runChatGPT(rep) {
    setGpt({ status: "loading", results: [], error: "" });
    const results = [];
    try {
      for (const r of rep.results) {
        const res = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${openaiKey.trim()}` },
          body: JSON.stringify({ model: openaiModel.trim(), messages: [{ role: "user", content: r.question }] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error?.message || `OpenAI returned status ${res.status}.`);
        const answer = cleanAnswer(data.choices?.[0]?.message?.content || "");
        results.push({ question: r.question, answer, ...analyzeAnswer(answer, rep.brand, rep.website, rep.knownNames) });
        setGpt({ status: "loading", results: [...results], error: "" });
      }
      setGpt({ status: "done", results, error: "" });
    } catch (err) {
      setGpt({ status: "error", results, error: err.message });
    }
  }

  return (
    <main className="page">
      <header className="masthead">
        <span className="logo">{APP_NAME}</span>
      </header>

      <section className="hero">
        <h1>Does AI recommend your brand?</h1>
        <p className="lede">
          We ask AI the questions your customers ask, then show you every answer with your name and your
          competitors&apos; names marked. Free, one check a day.
        </p>
        <figure className="sample" aria-label="Example of a checked AI answer">
          <p className="bubble ask">{SAMPLE.q}</p>
          <p className="bubble reply">
            <Highlighted text={SAMPLE.a} brand="Tallyhaus" website="" names={["Numbrly", "Ledgerfox"]} />
          </p>
          <figcaption>
            <span className="key brand">Your brand</span>
            <span className="key comp">Competitors</span>
          </figcaption>
        </figure>
      </section>

      <form className="check" onSubmit={onSubmit}>
        <div className="grid">
          <Field label="Brand name" hint="As customers would write it">
            <input required maxLength={80} value={form.brand} onChange={set("brand")} placeholder="Tallyhaus" />
          </Field>
          <Field label="Website" hint="Optional, helps us spot mentions">
            <input maxLength={200} value={form.website} onChange={set("website")} placeholder="tallyhaus.com" />
          </Field>
          <Field label="What do you sell, and to whom?" wide>
            <input
              required
              maxLength={160}
              value={form.niche}
              onChange={set("niche")}
              placeholder="Invoicing software for small design studios"
            />
          </Field>
          <Field label="Competitors" hint="Optional, up to 3, separated by commas" wide>
            <input maxLength={200} value={form.competitors} onChange={set("competitors")} placeholder="Numbrly, Ledgerfox" />
          </Field>
          <Field label="Email" hint="Your report is linked to this address" wide>
            <input required type="email" maxLength={200} value={form.email} onChange={set("email")} placeholder="you@company.com" />
          </Field>
        </div>

        {/* Bots ke liye jaal: insaan ko nazar nahi aata */}
        <input className="hp" tabIndex={-1} autoComplete="off" value={form.hp} onChange={set("hp")} aria-hidden="true" />

        <details className="advanced">
          <summary>Also check ChatGPT with your own OpenAI key</summary>
          <p className="small">
            Your key stays in this browser tab and goes straight to OpenAI. We never see or store it. Note that the
            API answers without web browsing, so results can differ from the ChatGPT app.
          </p>
          <div className="grid">
            <Field label="OpenAI API key">
              <input type="password" autoComplete="off" value={openaiKey} onChange={(e) => setOpenaiKey(e.target.value)} placeholder="sk-…" />
            </Field>
            <Field label="Model">
              <input value={openaiModel} onChange={(e) => setOpenaiModel(e.target.value)} />
            </Field>
          </div>
        </details>

        <label className="consent">
          <input type="checkbox" checked={form.marketingOk} onChange={set("marketingOk")} />
          <span>Email me when weekly tracking launches</span>
        </label>

        <button className="run" type="submit" disabled={status === "loading"}>
          {status === "loading" ? "Checking…" : "Run free check"}
        </button>
        <p className="small">
          Takes about 30 seconds. By running a check you agree to our <Link href="/privacy">privacy terms</Link>.
        </p>
      </form>

      <div aria-live="polite">
        {status === "loading" && (
          <section className="status">
            <span className="pulse" aria-hidden="true" />
            <p>{LOADING_STEPS[step]}</p>
          </section>
        )}
        {status === "error" && (
          <section className="status error">
            <p>{error}</p>
          </section>
        )}
      </div>

      {report && <Report report={report} gpt={gpt} />}

      <footer className="foot">
        <p>
          AI answers change from one day to the next. Every report is a snapshot of the moment it ran.
        </p>
        <Link href="/privacy">Privacy</Link>
      </footer>
    </main>
  );
}

function Field({ label, hint, wide, children }) {
  return (
    <label className={`field${wide ? " wide" : ""}`}>
      <span className="label">{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

function Highlighted({ text, brand, website, names }) {
  const parts = splitHighlights(text, brandTerms(brand, website), names);
  return parts.map((p, i) =>
    p.kind ? (
      <mark key={i} className={p.kind}>
        {p.t}
      </mark>
    ) : (
      <span key={i}>{p.t}</span>
    )
  );
}

function Report({ report, gpt }) {
  const mentionedCount = report.results.filter((r) => r.mentioned).length;
  const total = report.results.length;
  const date = new Date(report.createdAt).toLocaleString();

  return (
    <section className="report">
      <div className="verdict">
        <h2>
          Gemini named {report.brand} in {mentionedCount} of {total} answers
        </h2>
        <div className="meter" role="img" aria-label={`Visibility score ${report.score} out of 100`}>
          <div className="meter-fill" style={{ width: `${report.score}%` }} />
        </div>
        <p className="small">
          Visibility score {report.score}/100. Being named first scores highest; not being named scores zero.
          Checked {date} with {report.model}
          {report.grounding ? " and Google Search" : ""}.
        </p>
      </div>

      <h3>What Gemini said</h3>
      <AnswerList results={report.results} report={report} />

      {report.competitors.length > 0 && (
        <>
          <h3>Who got named instead</h3>
          <ul className="tally">
            {report.competitors.map((c) => (
              <li key={c.name}>
                <span className="tally-name">{c.name}</span>
                <span className="tally-bar" aria-hidden="true">
                  <span style={{ width: `${(c.count / total) * 100}%` }} />
                </span>
                <span className="tally-count">
                  {c.count} of {total}
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {report.suggestions.length > 0 && (
        <>
          <h3>How to get named more often</h3>
          <ul className="tips">
            {report.suggestions.map((s, i) => (
              <li key={i}>{s}</li>
            ))}
          </ul>
        </>
      )}

      {gpt.status !== "idle" && (
        <>
          <h3>What ChatGPT said</h3>
          {gpt.status === "loading" && (
            <p className="small">
              Asking ChatGPT… {gpt.results.length} of {total} done
            </p>
          )}
          {gpt.status === "error" && <p className="status error">{gpt.error}</p>}
          {gpt.results.length > 0 && (
            <>
              <p className="small">
                Named in {gpt.results.filter((r) => r.mentioned).length} of {gpt.results.length} answers. Score{" "}
                {overallScore(gpt.results)}/100.
              </p>
              <AnswerList results={gpt.results} report={report} />
            </>
          )}
        </>
      )}

      <aside className="upsell">
        <h3>Want this every week?</h3>
        <p>
          Weekly tracking, history charts, more AI assistants and client-ready PDF reports are coming soon. Tick
          the box above when you run a check and we&apos;ll email you when they launch.
        </p>
      </aside>
    </section>
  );
}

function AnswerList({ results, report }) {
  return (
    <ol className="answers">
      {results.map((r, i) => (
        <li key={i} className="answer">
          <details>
            <summary>
              <span className="q">{r.question}</span>
              <span className={`chip ${r.mentioned ? "yes" : "no"}`}>
                {r.mentioned ? `Named #${r.position}` : "Not named"}
              </span>
            </summary>
            <p className="bubble reply full">
              <Highlighted text={r.answer} brand={report.brand} website={report.website} names={report.knownNames} />
            </p>
          </details>
        </li>
      ))}
    </ol>
  );
}
