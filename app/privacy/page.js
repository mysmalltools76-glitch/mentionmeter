import Link from "next/link";
import { APP_NAME, CONTACT_EMAIL } from "@/lib/config";

export const metadata = { title: `Privacy — ${APP_NAME}` };

export default function Privacy() {
  return (
    <main className="page prose">
      <p><Link href="/">← Back to {APP_NAME}</Link></p>
      <h1>Privacy</h1>
      <p>
        When you run a check, we store your email address, the brand, website, niche and competitors you
        entered, the report we generated, and a one-way hash of your IP address. We use this to enforce the
        free daily limit and to show you your results. We email you about updates only if you tick the box
        that allows it.
      </p>
      <p>
        To generate reports, the questions and answers are processed by Google&apos;s Gemini API. On free
        API tiers, Google may use this data to improve its products, so don&apos;t enter anything confidential.
      </p>
      <p>
        If you add your own OpenAI API key, it stays in your browser for that session only. It is sent
        directly from your browser to OpenAI and never reaches or is stored on our server.
      </p>
      <p>
        To delete your data, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address you
        used and we will remove it.
      </p>
    </main>
  );
}
