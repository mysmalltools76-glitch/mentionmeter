import { NextResponse } from "next/server";
import crypto from "node:crypto";
import { gemini, parseJSON, mapLimit, RateLimitError } from "@/lib/gemini";
import { supabaseAdmin } from "@/lib/supabase";
import { QUESTION_COUNT, DAILY_LIMIT_EMAIL, DAILY_LIMIT_IP } from "@/lib/config";
import { analyzeAnswer, overallScore, competitorTally, cleanAnswer, brandTerms, isSameBrand } from "@/lib/analyze";

export const runtime = "nodejs";
export const maxDuration = 60; // Vercel par function ko 60 second tak chalne do

const EMAIL_RE = /^[^\s@,()<>]+@[^\s@,()<>]+\.[^\s@,()<>]{2,}$/;
const clip = (s, n) => String(s ?? "").trim().slice(0, n);
const fail = (message, status = 400) => NextResponse.json({ error: message }, { status });

export async function POST(req) {
  let body;
  try {
    body = await req.json();
  } catch {
    return fail("The request could not be read.");
  }

  // Bots ke liye chupa hua field. Insaan ise kabhi nahi bharta.
  if (body.hp) return fail("Request blocked.");

  const brand = clip(body.brand, 80);
  const website = clip(body.website, 200);
  const niche = clip(body.niche, 160);
  const email = clip(body.email, 200).toLowerCase();
  const marketingOk = Boolean(body.marketingOk);
  const competitors = String(body.competitors || "")
    .split(",")
    .map((c) => clip(c, 60))
    .filter(Boolean)
    .slice(0, 3);

  if (!brand) return fail("Enter your brand name.");
  if (!niche) return fail("Describe what you sell, so we know which questions to ask.");
  if (!EMAIL_RE.test(email)) return fail("Enter a valid email address.");

  // ---- Daily free limit ----
  const ip = (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "unknown";
  const ipHash = crypto.createHash("sha256").update(ip + (process.env.IP_SALT || "")).digest("hex");
  const admins = String(process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  const sb = supabaseAdmin();

  if (sb && !admins.includes(email)) {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [byEmail, byIp] = await Promise.all([
      sb.from("reports").select("id", { count: "exact", head: true }).eq("email", email).gte("created_at", since),
      sb.from("reports").select("id", { count: "exact", head: true }).eq("ip_hash", ipHash).gte("created_at", since),
    ]);
    if (byEmail.error || byIp.error) {
      console.error("Supabase limit check failed", byEmail.error || byIp.error);
    } else if ((byEmail.count || 0) >= DAILY_LIMIT_EMAIL || (byIp.count || 0) >= DAILY_LIMIT_IP) {
      return fail("You've used today's free check. Come back in 24 hours.", 429);
    }
  }

  try {
    // ---- 1. Customer jaise sawal banao ----
    const compLine = competitors.length
      ? `Known competitors: ${competitors.join(", ")}. One question may ask for alternatives to one of them.`
      : "";
    const qText = await gemini(
      `You help measure how visible brands are inside AI assistants.
Niche: "${niche}".
${compLine}
Write ${QUESTION_COUNT} realistic questions a potential customer would type into an AI assistant like ChatGPT while looking for a product or service in this niche.
Mix "best ..." questions, questions for a specific use case or type of customer, and recommendation or comparison questions.
Never mention the brand "${brand}".
Return only a JSON array of ${QUESTION_COUNT} strings.`,
      { json: true, temperature: 0.8 }
    );
    let questions = parseJSON(qText);
    if (!Array.isArray(questions)) questions = questions.questions || [];
    questions = questions.map((q) => clip(q, 240)).filter(Boolean).slice(0, QUESTION_COUNT);
    if (!questions.length) throw new Error("No questions were generated. Try describing your niche differently.");

    // ---- 2. Har sawal Gemini se poocho (bilkul customer ki tarah) ----
    const grounding = process.env.USE_GROUNDING === "true";
    const rawAnswers = await mapLimit(questions, 3, (q) => gemini(q, { grounding, temperature: 0.7 }));
    const answers = rawAnswers.map(cleanAnswer);

    // ---- 3. Jawabon mein se brands nikaalo + suggestions ----
    let mentionLists = [];
    let suggestions = [];
    try {
      const exText = await gemini(
        `Below are ${answers.length} answers an AI assistant gave about the niche "${niche}".
For each answer, list every company, product, brand or website it names, in the order they first appear. Use the exact spelling from the answer.
Then write 4 short, specific suggestions (one sentence each) for how "${brand}"${website ? ` (${website})` : ""} could get named more often in AI answers like these, based on what the named brands seem to have in common.
Return only JSON: {"mentions": [[...names in answer 1], [...], ...], "suggestions": ["...", "..."]}

${answers.map((a, i) => `--- Answer ${i + 1} ---\n${a.slice(0, 4000)}`).join("\n\n")}`,
        { json: true, temperature: 0.2 }
      );
      const ex = parseJSON(exText);
      mentionLists = Array.isArray(ex.mentions) ? ex.mentions : [];
      suggestions = (Array.isArray(ex.suggestions) ? ex.suggestions : []).map((s) => clip(s, 300)).slice(0, 5);
    } catch (e) {
      console.error("Extraction step failed, continuing with name matching only", e);
    }

    // Saare maloom naam: user ke diye competitors + AI ke jawabon mein aaye naam
    const bTerms = brandTerms(brand, website);
    const knownNames = [
      ...new Map(
        [...competitors, ...mentionLists.flat()]
          .map((n) => clip(n, 60))
          .filter((n) => n.length >= 2 && !isSameBrand(n, bTerms))
          .map((n) => [n.toLowerCase(), n])
      ).values(),
    ].slice(0, 60);

    const results = questions.map((question, i) => ({
      question,
      answer: answers[i],
      ...analyzeAnswer(answers[i], brand, website, knownNames),
    }));

    const report = {
      brand,
      website,
      niche,
      provider: "Gemini",
      model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
      grounding,
      score: overallScore(results),
      results,
      competitors: competitorTally(results),
      knownNames,
      suggestions,
      createdAt: new Date().toISOString(),
    };

    // ---- 4. Database mein save ----
    if (sb) {
      const { error } = await sb.from("reports").insert({
        email,
        marketing_ok: marketingOk,
        ip_hash: ipHash,
        brand,
        website,
        niche,
        competitors,
        score: report.score,
        result: report,
      });
      if (error) console.error("Supabase insert failed", error);
    } else {
      console.warn("Supabase is not configured, so this report was not saved.");
    }

    return NextResponse.json(report);
  } catch (e) {
    console.error(e);
    if (e instanceof RateLimitError) return fail(e.message, 503);
    return fail(e.message || "Something went wrong while running the check.", 500);
  }
}
