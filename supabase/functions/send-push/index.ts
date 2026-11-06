// Supabase Edge Function "send-push" — real push notifications (also when the app is closed).
// Keep "Verify JWT" ON. Server callers send a project JWT (the daily timer reads it from
// public.app_secrets → 'functions_jwt', saved here on first use) plus x-push-secret.
//
//   { type: 'public-key' }                 signed-in user  → returns the VAPID public key
//   { type: 'daily', slot: 'morning'|'evening' }  daily timer (x-push-secret) → today's chapter
//   { type: 'flagged', answer_id }          check-answer (x-push-secret) → head servants
//   { type: 'posted', completion_id }       database trigger (x-push-secret) → everyone else
//
// The VAPID keys are created automatically on first use and kept in public.app_secrets
// (a table nobody can read from the app). Nothing needs to be pasted by hand.

import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-push-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

const url = Deno.env.get('SUPABASE_URL')!;
const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

async function secret(name: string): Promise<string | null> {
  const { data } = await admin.from('app_secrets').select('value').eq('name', name).maybeSingle();
  return data?.value ?? null;
}

let vapid: { publicKey: string; privateKey: string } | null = null;
async function vapidKeys() {
  if (vapid) return vapid;
  let publicKey = await secret('vapid_public_key');
  let privateKey = await secret('vapid_private_key');
  if (!publicKey || !privateKey) {
    const keys = webpush.generateVAPIDKeys();
    // ignoreDuplicates: if two calls race, the first saved pair wins.
    await admin.from('app_secrets').upsert(
      [{ name: 'vapid_public_key', value: keys.publicKey }, { name: 'vapid_private_key', value: keys.privateKey }],
      { onConflict: 'name', ignoreDuplicates: true },
    );
    publicKey = await secret('vapid_public_key');
    privateKey = await secret('vapid_private_key');
  }
  vapid = { publicKey: publicKey!, privateKey: privateKey! };
  webpush.setVapidDetails('mailto:noreply@theapostles.app', vapid.publicKey, vapid.privateKey);
  return vapid;
}

type Message = { title: string; body: string; url: string; tag: string };

/** Sends to every device of the given users; removes subscriptions that no longer exist. */
async function sendTo(userIds: string[], message: (userId: string) => Message | null) {
  if (userIds.length === 0) return { sent: 0, removed: 0 };
  await vapidKeys();
  const { data: subs } = await admin.from('push_subscriptions').select('endpoint, user_id, p256dh, auth').in('user_id', userIds);
  let sent = 0;
  let removed = 0;
  const errors: string[] = [];
  await Promise.all((subs ?? []).map(async (sub) => {
    const payload = message(sub.user_id);
    if (!payload) return;
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 12, urgency: 'high' },
      );
      sent += 1;
    } catch (error) {
      const status = (error as { statusCode?: number })?.statusCode;
      const detail = (error as { body?: string; message?: string })?.body || (error as Error)?.message || '';
      errors.push(`${new URL(sub.endpoint).host} → ${status ?? 'error'} ${String(detail).slice(0, 120)}`);
      if (status === 404 || status === 410) {
        await admin.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        removed += 1;
      }
    }
  }));
  return { sent, removed, errors: errors.slice(0, 5) };
}

const cairoToday = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Cairo' }).format(new Date());

async function sendDaily(slot: 'morning' | 'evening') {
  const today = cairoToday();
  const { data: assignment } = await admin
    .from('reading_assignments')
    .select('id, reminder_verse, bible_passages(reference_ar, verses)')
    .eq('status', 'published')
    .eq('target_type', 'all')
    .eq('scheduled_date', today)
    .limit(1)
    .maybeSingle();
  if (!assignment) return { sent: 0, note: 'no reading today' };

  // deno-lint-ignore no-explicit-any
  const passage = (assignment as any).bible_passages ?? {};
  const reference: string = passage.reference_ar ?? 'إصحاح النهارده';
  const verses: Array<{ number: number; text: string }> = Array.isArray(passage.verses) ? passage.verses : [];
  const verse = verses.find((v) => v.number === assignment.reminder_verse) ?? verses[0];

  const { data: done } = await admin.from('reading_completions').select('student_id').eq('assignment_id', assignment.id);
  const finished = new Set((done ?? []).map((row) => row.student_id));
  const { data: users } = await admin.from('users').select('id').in('role', ['student', 'teacher', 'head']);
  const waiting = (users ?? []).map((u) => u.id).filter((id) => !finished.has(id));

  const message: Message = slot === 'morning'
    ? {
        title: `📖 إصحاح النهارده: ${reference}`,
        body: verse ? `«${verse.text.slice(0, 140)}»` : 'افتح التطبيق واقرأ إصحاح النهارده.',
        url: '/?screen=my-readings',
        tag: `apostles-daily-${today}`,
      }
    : {
        title: '🔥 لسه مقرتش إصحاح النهارده',
        body: `${reference} — اقرأه قبل نص الليل عشان الـ Streak بتاعك.`,
        url: '/?screen=my-readings',
        tag: `apostles-daily-${today}`,
      };
  return sendTo(waiting, () => message);
}

async function sendFlagged(answerId: string) {
  const { data: answer } = await admin
    .from('reading_answers')
    .select('answer_text, users(name)')
    .eq('id', answerId)
    .maybeSingle();
  if (!answer) return { sent: 0 };
  // deno-lint-ignore no-explicit-any
  const name = (answer as any).users?.name ?? 'طالب';
  let text = String(answer.answer_text);
  if (text === '🔒') {
    const { data: plain } = await admin.rpc('answer_text_for_service', { p_answer_id: answerId });
    if (typeof plain === 'string') text = plain;
  }
  // Private accounts → only their guardian; everyone else → all head servants.
  const { data: recipients, error: recipientsError } = await admin.rpc('flag_alert_recipients', { p_answer_id: answerId });
  let ids = Array.isArray(recipients) ? recipients.map((r: unknown) => (typeof r === 'string' ? r : Object.values(r as object)[0] as string)) : [];
  if (recipientsError) {
    // Database not updated yet: fall back to all head servants.
    const { data: heads } = await admin.from('users').select('id').eq('role', 'head');
    ids = (heads ?? []).map((h) => h.id);
  }
  return sendTo(ids, () => ({
    title: '⚠️ إجابة محتاجة متابعة',
    body: `${name}: «${text.slice(0, 100)}»`,
    url: '/?screen=review',
    tag: `apostles-flagged-${answerId}`,
  }));
}

/** Someone finished a reading → everyone else (private accounts: only their guardian). Tap → «ورينى». */
async function sendPosted(completionId: string) {
  const { data: post } = await admin
    .from('reading_completions')
    .select('student_id, assignment_id')
    .eq('id', completionId)
    .maybeSingle();
  if (!post) return { sent: 0, note: 'no reading' };
  const [{ data: person }, { data: assignment }, { data: streaks }, { data: recipients }] = await Promise.all([
    admin.from('users').select('name').eq('id', post.student_id).maybeSingle(),
    admin.from('reading_assignments').select('bible_passages(reference_ar)').eq('id', post.assignment_id).maybeSingle(),
    admin.rpc('get_reading_streaks', { p_student_ids: [post.student_id] }),
    admin.rpc('post_alert_recipients', { p_completion_id: completionId }),
  ]);
  const ids = Array.isArray(recipients)
    ? recipients.map((r: unknown) => (typeof r === 'string' ? r : Object.values(r as object)[0] as string))
    : [];
  const name = String(person?.name || '').trim() || 'حد';
  // deno-lint-ignore no-explicit-any
  const reference: string = (assignment as any)?.bible_passages?.reference_ar ?? 'إصحاح النهارده';
  const streak = Array.isArray(streaks) && streaks[0] ? Number(streaks[0].current_streak || 0) : 0;
  return sendTo(ids, () => ({
    title: `🔥 ${name} قرأ ${reference}`,
    body: streak > 0 ? `الـ Streak بتاعه وصل ${streak} 🔥 — اضغط وشوف` : 'اضغط وشوف قراءته',
    url: `/?screen=warini&user=${post.student_id}`,
    // One notification per person: a newer one replaces the older one on the phone.
    tag: `apostles-posted-${post.student_id}`,
  }));
}

// The daily timer needs a project JWT to pass "Verify JWT"; save the (public) anon JWT once.
let jwtSaved = false;
async function saveFunctionsJwt() {
  if (jwtSaved) return;
  jwtSaved = true;
  const anon = Deno.env.get('SUPABASE_ANON_KEY');
  if (anon) await admin.from('app_secrets').upsert({ name: 'functions_jwt', value: anon }, { onConflict: 'name' });
}

Deno.serve(async (req) => {
  await saveFunctionsJwt().catch(() => undefined);
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: { type?: string; slot?: string; answer_id?: string; completion_id?: string; email?: string; title?: string; message?: string; url?: string } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Bad request' }, 400);
  }

  try {
    if (body.type === 'public-key') {
      // Any signed-in member may ask for the public key (it is public by design).
      const userClient = createClient(url, Deno.env.get('SUPABASE_ANON_KEY')!, {
        global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
      });
      const { data } = await userClient.auth.getUser();
      if (!data?.user) return json({ error: 'Not signed in' }, 401);
      return json({ publicKey: (await vapidKeys()).publicKey });
    }

    // Everything else is server-to-server only.
    const expected = await secret('push_cron_secret');
    if (!expected || req.headers.get('x-push-secret') !== expected) return json({ error: 'Forbidden' }, 403);

    if (body.type === 'daily') return json(await sendDaily(body.slot === 'evening' ? 'evening' : 'morning'));
    if (body.type === 'flagged' && body.answer_id) return json(await sendFlagged(body.answer_id));
    if (body.type === 'posted' && body.completion_id) return json(await sendPosted(body.completion_id));
    if (body.type === 'direct' && body.email) {
      // One person (sent by a head servant from the SQL Editor). Opens body.url inside the app.
      const { data: person } = await admin.from('users').select('id').ilike('email', String(body.email).trim()).maybeSingle();
      if (!person) return json({ error: 'No user with this email' }, 404);
      const target = typeof body.url === 'string' && body.url.startsWith('/') ? body.url : '/';
      return json(await sendTo([person.id], () => ({
        title: String(body.title || 'THE APOSTLES').slice(0, 80),
        body: String(body.message || '').slice(0, 200),
        url: target,
        tag: `apostles-direct-${Date.now()}`,
      })));
    }
    return json({ error: 'Unknown type' }, 400);
  } catch (error) {
    return json({ error: String(error instanceof Error ? error.message : error) }, 500);
  }
});
