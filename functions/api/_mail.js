/**
 * Vezoria — ✉️ envoi d’un e-mail (code de vérification, alerte « nouvel appareil »).
 * Cloudflare Email Service : binding `EMAIL` (send_email) s’il est branché, sinon l’API REST
 * (variables CF_ACCOUNT_ID + CF_EMAIL_TOKEN). Expéditeur : MAIL_FROM (défaut noreply@vezoria.fr).
 * MAIL_DEV = '1' (tests seulement) : rien n’est envoyé, le message est rendu à l’appelant.
 */
export async function sendMail(env, to, subject, text, html) {
  const from = env.MAIL_FROM || 'noreply@vezoria.fr';   // adresse seule : le format « Nom <adresse> » n’est pas garanti par l’API
  if (env.MAIL_DEV === '1') return { ok: true, dev: { to, subject, text } };
  try {
    if (env.EMAIL && typeof env.EMAIL.send === 'function') { const r = await env.EMAIL.send({ to, from, subject, text, html: html || undefined }); return { ok: true, id: r && r.messageId }; }
    if (env.CF_ACCOUNT_ID && env.CF_EMAIL_TOKEN) {
      const r = await fetch('https://api.cloudflare.com/client/v4/accounts/' + env.CF_ACCOUNT_ID + '/email/sending/send', {
        method: 'POST', headers: { 'Authorization': 'Bearer ' + env.CF_EMAIL_TOKEN, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to, from, subject, text, html: html || undefined }) });
      const j = await r.json().catch(() => ({}));
      return r.ok && j.success !== false ? { ok: true } : { ok: false, error: (j.errors && j.errors[0] && j.errors[0].message) || ('HTTP ' + r.status) };
    }
  } catch (e) { return { ok: false, error: String(e && (e.code || e.message) || e) }; }
  return { ok: false, error: 'Envoi d’e-mails non configuré sur le serveur (Cloudflare Email Service)' };
}
