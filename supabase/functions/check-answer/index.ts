// Supabase Edge Function "check-answer"
// Checks one «شوفت ربنا فين» answer with the NVIDIA AI and saves the verdict in
// public.reading_answer_reviews. Flagged answers then appear for head servants.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   NVIDIA_API_KEY   = your nvapi-... key   (never put it in the app code)
//   NVIDIA_MODEL     = optional, tried first (then the fallbacks below)
// SUPABASE_URL, SUPABASE_ANON_KEY and SUPABASE_SERVICE_ROLE_KEY are provided automatically.

import { createClient } from 'npm:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const SYSTEM_PROMPT = `أنت مساعد لخدمة كنسية (أرثوذكسية) لطلاب إعدادي. الطالب قرأ إصحاحًا من الكتاب المقدس وأجاب على سؤال.
مهمتك فقط اكتشاف الإجابات السيئة بوضوح. علّم الإجابة (flagged = true) فقط إذا كانت:
1) كلام بلا معنى أو حروف عشوائية (مثل: اهاا، asdf، تاتاتا)، أو
2) فيها قلة احترام أو سخرية أو ألفاظ غير لائقة، أو
3) عن موضوع آخر تمامًا ليس له علاقة بالله أو بالكتاب المقدس أو بالإصحاح، أو
4) منسوخة من برنامج ذكاء اصطناعي (ChatGPT / Gemini …) بعلامات واضحة: كلام موجّه للطالب نفسه زي «خد يا سيدي» أو «تقدر تنسخها»، أو ذكر Gemini/ChatGPT/الذكاء الاصطناعي، أو تنسيق مقالة جاهزة (أولاً/ثانياً/ثالثاً، عناوين، علامات تنصيص حول الإجابة كلها).
الإجابة الطويلة أو الحلوة اللي مكتوبة بأسلوب طالب عادي (عامية، أخطاء إملائية، كلام شخصي) مقبولة ومش منسوخة.
أي إجابة تذكر الله أو عمله أو صفاته أو حدثًا أو آية من الإصحاح تُعتبر مقبولة (flagged = false) حتى لو كانت قصيرة أو بسيطة أو بالعامية أو فيها أخطاء إملائية أو لا تجيب على السؤال بدقة — إلا لو منسوخة من ذكاء اصطناعي (رقم 4).
عند الشك اختر flagged = false.
رد بـ JSON فقط بهذا الشكل: {"flagged": true أو false, "reason": "سبب قصير بالعربي"}`;

/** Clear signs an answer was pasted from an AI chatbot (checked before asking the AI). */
function copiedFromAi(text: string): boolean {
  if (/gemini|chat\s*gpt|chatgpt|copilot|جيميني|جيمناي|شات\s*جي\s*بي\s*تي|الذكاء الاصطناعي|ذكاء اصطناعي/i.test(text)) return true;
  if (/تقدر تنسخ|تقدر تكتبها|خد يا سيدي|إجابة جبارة|اجابة جبارة/.test(text)) return true;
  return /(أولا|اولا|أولاً|اولاً)[\s\S]{0,400}(ثانيا|ثانياً)[\s\S]{0,400}(ثالثا|ثالثاً)/.test(text);
}

// Model that answered last time (kept while the function stays warm).
let workingModel: string | null = null;

/**
 * Asks NVIDIA. First the model that worked last time (and NVIDIA_MODEL if set),
 * then MANY chat models from NVIDIA's live list at the same time — the first
 * good answer wins. Listed models may be disabled for this key (404), retired
 * (410), busy (429/5xx) or slow, so racing them is far more reliable.
 */
async function askNvidia(key: string, preferred: string[], prompt: string): Promise<{ model: string; content: string }> {
  const errors: string[] = [];
  const ask = async (candidate: string, ms: number): Promise<{ model: string; content: string }> => {
    try {
      const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
        method: 'POST',
        signal: AbortSignal.timeout(ms),
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ model: candidate, temperature: 0, max_tokens: 200, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!res.ok) throw new Error(`${res.status}`);
      const content: string = (await res.json())?.choices?.[0]?.message?.content ?? '';
      if (!/\{[\s\S]*"flagged"[\s\S]*\}/.test(content)) throw new Error('bad reply');
      return { model: candidate, content };
    } catch (error) {
      errors.push(`${candidate} → ${error instanceof Error ? (error.name === 'TimeoutError' ? 'timeout' : error.message) : error}`);
      throw error;
    }
  };

  const first = [workingModel, ...preferred].filter((m, i, all): m is string => Boolean(m) && all.indexOf(m) === i);
  // NVIDIA's free tier sometimes answers 404/429/5xx for a moment: retry each preferred model.
  for (const [position, candidate] of first.entries()) {
    const attempts = position === 0 ? 3 : 1; // keep the whole check under the time limit
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      try {
        const result = await ask(candidate, 20000);
        workingModel = result.model;
        return result;
      } catch {
        await new Promise((resolve) => setTimeout(resolve, 1500 * (attempt + 1)));
      }
    }
  }

  // Race chat models from NVIDIA's live list (all at once, first good answer wins).
  try {
    const list = await fetch('https://integrate.api.nvidia.com/v1/models', { signal: AbortSignal.timeout(8000) });
    const ids: string[] = ((await list.json())?.data ?? []).map((m: { id: string }) => m.id);
    const chat = ids
      .filter((id) => !first.includes(id))
      .filter((id) => /instruct|-it\b|chat|nemotron|llama|qwen|mistral|gemma|deepseek|phi/i.test(id))
      .filter((id) => !/embed|guard|reward|vision|vl\b|coder|code|safety|retriev|rerank|parse|translate|math|diffusion|audio|speech|asr|tts|clip|nv-?embed|ocr|detector|seg/i.test(id))
      .slice(0, 24);
    if (chat.length) {
      const result = await Promise.any(chat.map((candidate) => ask(candidate, 25000)));
      workingModel = result.model;
      return result;
    }
  } catch {
    // all failed — report below
  }
  throw new Error(`NVIDIA: no model answered | ${errors.slice(0, 12).join(' | ')}`);
}

const url = Deno.env.get('SUPABASE_URL')!;
const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const admin = createClient(url, serviceKey);
// Preferred models (then NVIDIA's live list, see askNvidia).
const MODELS = [
  Deno.env.get('NVIDIA_MODEL'),
  'nvidia/nemotron-3.5-bolt-e4b', // tested 30 Oct + 1 Nov 2026: <1 s, correct Arabic verdicts
  'nvidia/nemotron-3-ultra-550b-a55b', // slower backup
].filter((m): m is string => Boolean(m));

const ANSWER_SELECT = 'id, assignment_id, student_id, answer_text, reading_assignments(question_text, bible_passages(reference_ar))';
type AnswerRow = { id: string; assignment_id: string; student_id: string; answer_text: string; reading_assignments?: unknown };

async function pushSecret(): Promise<string | null> {
  const { data } = await admin.from('app_secrets').select('value').eq('name', 'push_cron_secret').maybeSingle();
  return data?.value ?? null;
}

/** Checks one answer with the AI, saves the verdict and alerts head servants if flagged. */
async function checkOne(nvidiaKey: string, answer: AnswerRow): Promise<'ok' | 'flagged' | 'error'> {
  // deno-lint-ignore no-explicit-any
  const assignment = (answer as any).reading_assignments ?? {};
  const question = assignment.question_text ?? 'شوفت ربنا فين في الإصحاح؟';
  const reference = assignment.bible_passages?.reference_ar ?? '';

  // Private accounts store «🔒» in the table; read the decrypted text through the database.
  if (answer.answer_text === '🔒') {
    const { data: plain } = await admin.rpc('answer_text_for_service', { p_answer_id: answer.id });
    if (typeof plain === 'string') answer = { ...answer, answer_text: plain };
  }

  let model = MODELS[0] ?? null;
  let verdict: 'ok' | 'flagged' | 'error' = 'error';
  let reason: string | null = null;
  if (copiedFromAi(answer.answer_text)) {
    verdict = 'flagged';
    reason = 'منسوخة من برنامج ذكاء اصطناعي (ChatGPT / Gemini)';
    model = 'rules';
  } else try {
    const response = await askNvidia(nvidiaKey, MODELS, `${SYSTEM_PROMPT}\n\nالإصحاح: ${reference}\nالسؤال: ${question}\nإجابة الطالب: ${answer.answer_text}`);
    model = response.model;
    const match = response.content.replace(/<think>[\s\S]*?<\/think>/g, '').match(/\{[\s\S]*\}/);
    const parsed = match ? JSON.parse(match[0]) : null;
    if (parsed && typeof parsed.flagged === 'boolean') {
      verdict = parsed.flagged ? 'flagged' : 'ok';
      reason = typeof parsed.reason === 'string' ? parsed.reason.slice(0, 500) : null;
    } else {
      reason = 'رد غير متوقع من الذكاء الاصطناعي';
    }
  } catch (error) {
    reason = String(error instanceof Error ? error.message : error).slice(0, 500);
  }

  // A new verdict (e.g. after the answer was edited) puts it back in the queue.
  const { error: saveError } = await admin.from('reading_answer_reviews').upsert({
    answer_id: answer.id,
    assignment_id: answer.assignment_id,
    student_id: answer.student_id,
    verdict,
    reason,
    model,
    checked_at: new Date().toISOString(),
    status: 'pending',
    handled_by: null,
    handled_at: null,
  });
  if (saveError) throw new Error(saveError.message);

  // Flagged → push notification to the head servants (function "send-push").
  if (verdict === 'flagged') {
    const secret = await pushSecret();
    if (secret) {
      await fetch(`${url}/functions/v1/send-push`, {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${serviceKey}`, 'x-push-secret': secret },
        body: JSON.stringify({ type: 'flagged', answer_id: answer.id }),
      }).catch(() => undefined);
    }
  }
  return verdict;
}

/**
 * Timer mode: checks answers from the last 7 days that were never checked
 * (e.g. the app closed right after «تمت القراءة») or whose check failed.
 */
async function checkBacklog(nvidiaKey: string) {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data: rows, error } = await admin
    .from('reading_answers')
    .select(`${ANSWER_SELECT}, reading_answer_reviews(verdict)`)
    .gte('submitted_at', since)
    .order('submitted_at', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  // deno-lint-ignore no-explicit-any
  const todo = (rows ?? []).filter((row: any) => {
    const review = Array.isArray(row.reading_answer_reviews) ? row.reading_answer_reviews[0] : row.reading_answer_reviews;
    return !review || review.verdict === 'error';
  }) as AnswerRow[];

  const deadline = Date.now() + 30_000; // start new checks only in the first 30 s (each can take up to ~2 min if NVIDIA is down)
  const counts = { ok: 0, flagged: 0, error: 0, left: 0 };
  let index = 0;
  const worker = async () => {
    while (index < todo.length) {
      if (Date.now() > deadline) return;
      const answer = todo[index++];
      try {
        counts[await checkOne(nvidiaKey, answer)] += 1;
      } catch {
        counts.error += 1;
      }
    }
  };
  await Promise.all([worker(), worker()]); // 2 at a time: gentler on NVIDIA's free tier
  counts.left = Math.max(0, todo.length - index);
  return { found: todo.length, ...counts };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const nvidiaKey = Deno.env.get('NVIDIA_API_KEY');
  if (!nvidiaKey) return json({ error: 'NVIDIA_API_KEY secret is missing' }, 500);

  let body: { answer_id?: string; type?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  // Timer (server) mode: catch up on missed / failed checks.
  if (body.type === 'backlog') {
    const secret = await pushSecret();
    if (!secret || req.headers.get('x-push-secret') !== secret) return json({ error: 'Forbidden' }, 403);
    try {
      return json(await checkBacklog(nvidiaKey));
    } catch (error) {
      return json({ error: String(error instanceof Error ? error.message : error) }, 500);
    }
  }

  // App mode: only the author of the answer may request its check.
  const userClient = createClient(url, anonKey, { global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } } });
  const { data: userData } = await userClient.auth.getUser();
  const user = userData?.user;
  if (!user) return json({ error: 'Not signed in' }, 401);

  const answerId = String(body.answer_id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(answerId)) return json({ error: 'Bad answer id' }, 400);

  const { data: answer, error: answerError } = await admin.from('reading_answers').select(ANSWER_SELECT).eq('id', answerId).maybeSingle();
  if (answerError || !answer) return json({ error: 'Answer not found' }, 404);
  if (answer.student_id !== user.id) return json({ error: 'Not your answer' }, 403);

  try {
    return json({ verdict: await checkOne(nvidiaKey, answer as AnswerRow) });
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
