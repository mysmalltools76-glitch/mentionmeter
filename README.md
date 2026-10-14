# MentionMeter — AI Visibility Checker (free MVP)

Ye tool check karta hai ke jab customer AI (Gemini, aur user ki apni key se ChatGPT) se sawal poochta hai, to jawab mein aap ka brand aata hai ya nahi, kis number par, aur kaunse competitors aate hain.

Neeche har step tarteeb se likha hai. Ek step mukammal karo, phir agla.

---

## Step 0: Computer par Node.js install karo

1. https://nodejs.org par jao aur **LTS** version download kar ke install karo.
2. Install hone ke baad terminal kholo (Windows: Start menu mein "cmd" ya "PowerShell" likho) aur ye likho:
   ```
   node --version
   ```
   Agar `v20` ya us se upar ka number aaye to theek hai.

Code edit karne ke liye **VS Code** (https://code.visualstudio.com) install kar lo, free hai.

---

## Step 1: Gemini API key lo (free)

1. https://aistudio.google.com par apne Gmail se login karo.
2. **Get API key** → **Create API key** dabao.
3. Key copy kar ke kahin safe jagah rakh lo (Notepad mein). Ye key kisi ko mat dikhana.
4. AI Studio mein dekh lo ke kaunsa model free mein available hai (jaise `gemini-2.5-flash`). Agar naam alag ho to Step 3 mein `GEMINI_MODEL` mein wahi naam likhna.

**Note:** Free tier ki limits aur terms Google badalta rehta hai, aur free tier par Google data ko apni services behtar karne ke liye use kar sakta hai. Jab paid customers aayein to Gemini ka paid tier le lena.

---

## Step 2: Supabase database banao (free)

1. https://supabase.com par **Start your project** → Gmail/GitHub se sign up karo.
2. **New project** banao. Koi bhi naam do, ek strong database password rakho (save kar lo), aur region apne qareeb wala chuno.
3. Project bannay mein 1-2 minute lagenge.
4. Left menu mein **SQL Editor** kholo → **New query**.
5. Is project ki file `supabase/schema.sql` kholo, us ka saara text copy kar ke wahan paste karo, aur **Run** dabao. "Success" aana chahiye.
6. Ab **Project Settings** (gear icon) → **API Keys** / **Data API** mein jao aur do cheezen copy karo:
   - **Project URL** (jaise `https://abcxyz.supabase.co`)
   - **secret key** (agar purana dashboard ho to is ka naam `service_role` hoga)

   Secret key bhi kisi ko mat dikhana, aur kabhi browser wale code mein mat daalna.

Baad mein emails aur reports dekhne ke liye: **Table Editor** → `reports` table.

---

## Step 3: Project apne computer par chalao

1. Ye zip file unzip karo. Folder ka naam `ai-mention-check` hoga.
2. Terminal mein us folder mein jao:
   ```
   cd path/to/ai-mention-check
   ```
   (VS Code mein folder khol kar **Terminal → New Terminal** se bhi seedha wahin khulta hai.)
3. Packages install karo:
   ```
   npm install
   ```
4. `.env.example` file ki copy banao aur us ka naam `.env.local` rakho. Us mein apni values bharo:
   ```
   GEMINI_API_KEY=yahan-gemini-key
   GEMINI_MODEL=gemini-2.5-flash
   USE_GROUNDING=false
   SUPABASE_URL=https://abcxyz.supabase.co
   SUPABASE_SECRET_KEY=yahan-secret-key
   IP_SALT=koi-bhi-lamba-random-text-jaise-k29dj38fh2
   ADMIN_EMAILS=aap-ki-email@gmail.com
   ```
   `ADMIN_EMAILS` mein apni email daalo taake testing ke waqt daily limit na lage.
5. Chalao:
   ```
   npm run dev
   ```
6. Browser mein http://localhost:3000 kholo. Form bharo aur **Run free check** dabao.

---

## Step 4: Testing checklist

In sab ko ek ek kar ke check karo:

- [ ] Apne kisi asli brand ke saath check chalao. ~30 second mein report aani chahiye.
- [ ] Kisi bara brand (jaise koi mashhoor software) ke saath chalao. Us ka naam zyada tar jawabon mein **yellow** highlight hona chahiye.
- [ ] Supabase → Table Editor → `reports` mein nayi row nazar aaye.
- [ ] Ek aisi email se dobara chalao jo `ADMIN_EMAILS` mein **nahi**. Doosri dafa "You've used today's free check" aana chahiye.
- [ ] Ghalat email (jaise `abc`) daalo, error aana chahiye.
- [ ] Mobile par website khol kar dekho ke design theek lag raha hai.
- [ ] (Optional) Agar OpenAI key hai to "Also check ChatGPT" khol kar test karo.

**Agar koi error aaye:** terminal mein jo laal text aaye, us ka screenshot ya copy le kar mujhe bhej do, main fix kar dunga.

---

## Step 5: Internet par live karo (Vercel, free)

1. https://github.com par account banao.
2. **New repository** banao (naam: `ai-mention-check`, Private rakh sakte ho).
3. Code upload karo. Sab se aasaan: **GitHub Desktop** (https://desktop.github.com) install karo, repository clone karo, project ki files us folder mein copy karo, phir **Commit** aur **Push** dabao.

   ⚠️ `node_modules` folder aur `.env.local` file upload **nahi** honi chahiye. `.gitignore` file ye khud rokti hai, bas use delete mat karna.
4. https://vercel.com par GitHub se login karo → **Add New → Project** → apni repository **Import** karo.
5. **Environment Variables** mein wahi saari values daalo jo `.env.local` mein hain (ek ek kar ke naam aur value).
6. **Deploy** dabao. 1-2 minute mein aap ko ek link milega jaise `ai-mention-check.vercel.app`. Yahi aap ki live website hai.
7. Live link par dobara Step 4 wali testing karo.

**Zaroori note:** Vercel ka free (Hobby) plan un ki terms ke mutabiq personal/non-commercial use ke liye hai. Jab aap paise lena shuru karo to Vercel ka Pro plan lena hoga, ya un ki current terms check kar lena.

---

## Cheezen kahan badalni hain

| Kya badalna hai | Kahan |
|---|---|
| Product ka naam | `lib/config.js` → `APP_NAME` |
| Kitne sawal poochne hain | `lib/config.js` → `QUESTION_COUNT` |
| Daily free limit | `lib/config.js` → `DAILY_LIMIT_EMAIL`, `DAILY_LIMIT_IP` |
| Privacy page ki contact email | `lib/config.js` → `CONTACT_EMAIL` |
| ChatGPT ka default model | `lib/config.js` → `DEFAULT_OPENAI_MODEL` |
| Website ka text aur design | `app/page.js` aur `app/globals.css` |

---

## Aam errors aur un ka hal

- **"GEMINI_API_KEY is missing"** → `.env.local` (ya Vercel ke Environment Variables) mein key nahi lagi. Value daal kar server dobara chalao (`Ctrl+C`, phir `npm run dev`).
- **"Gemini error 404"** → model ka naam ghalat hai. AI Studio se sahi naam le kar `GEMINI_MODEL` mein likho.
- **"Gemini is busy right now"** → free tier ki per-minute limit lag gayi. Ek minute ruk kar dobara try karo. Bar bar ho to `lib/config.js` mein `QUESTION_COUNT` kam kar do (jaise 4).
- **Report aa jati hai lekin Supabase mein row nahi** → `SUPABASE_URL` ya `SUPABASE_SECRET_KEY` ghalat hai, ya `schema.sql` run nahi hua.
- **Vercel par "timeout"** → `USE_GROUNDING=false` rakho aur `QUESTION_COUNT` kam karo.
- **ChatGPT check mein error** → OpenAI key ghalat hai, us mein credit nahi, ya model ka naam badal gaya hai.

---

## Project ki files (kya kya hai)

```
app/page.js            → Main website (form + report)
app/globals.css        → Design / colors (light + dark mode)
app/api/check/route.js → Backend: Gemini se sawal-jawab, analysis, database save
app/privacy/page.js    → Privacy page
lib/gemini.js          → Gemini API se baat karne wala code
lib/analyze.js         → Brand/competitor dhoondne aur score banane ka logic
lib/supabase.js        → Database connection
lib/config.js          → Settings (naam, limits)
supabase/schema.sql    → Database table banane ka code
```

---

## Aage kya (paid version ke liye)

Jab free version par users aane lagein, to ye features add karenge: login, weekly automatic tracking, score ki history ka graph, white-label PDF report, aur zyada AI models. Is ke liye yahi Supabase database kaam aayega.
