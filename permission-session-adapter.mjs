// Server-only session verification adapter for existing kadamjay-sessions D1.
// Use inside Cloudflare Worker. No browser code, no production writes.
// Caller MUST authenticate the Firebase employee and its device when creating a session.
const encoder = new TextEncoder();
export async function digestToken(token) {
  const bytes = await crypto.subtle.digest('SHA-256', encoder.encode(token));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2,'0')).join('');
}
export async function verifiedSession(request, env, now=Math.floor(Date.now()/1000)) {
  if (!env?.SESSIONS_DB) throw new Error('SESSIONS_DB_NOT_CONFIGURED');
  const auth=request.headers.get('Authorization')||'';
  const match=/^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(auth);
  if (!match) return null;
  const hash=await digestToken(match[1]);
  const session=await env.SESSIONS_DB.prepare(
    'SELECT worker_id, expires_at, revoked_at FROM sessions WHERE token_hash = ? LIMIT 1'
  ).bind(hash).first();
  if (!session || session.revoked_at !== null || !Number.isFinite(Number(session.expires_at)) || Number(session.expires_at)<=now) return null;
  if (typeof session.worker_id!=='string'||!session.worker_id.trim()) return null;
  return {workerId:session.worker_id,expiresAt:Number(session.expires_at)};
}
export async function issueSession(env, verifiedIdentity, now=Math.floor(Date.now()/1000)) {
  // verifiedIdentity MUST come from trusted server-side Firebase PIN + bound-device check.
  // Never accept workerId from an HTTP request body.
  if (!verifiedIdentity?.workerId || verifiedIdentity.deviceVerified!==true || verifiedIdentity.pinVerified!==true) throw new Error('IDENTITY_NOT_VERIFIED');
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const token=Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');
  const hash=await digestToken(token);
  const expiresAt=now+8*3600;
  await env.SESSIONS_DB.prepare('INSERT INTO sessions (token_hash,worker_id,created_at,expires_at,revoked_at) VALUES (?,?,?,?,NULL)')
    .bind(hash,verifiedIdentity.workerId,now,expiresAt).run();
  return {token,expiresAt};
}
export async function revokeSession(request,env,now=Math.floor(Date.now()/1000)) {
  const auth=request.headers.get('Authorization')||'';
  const match=/^Bearer ([A-Za-z0-9_-]{32,256})$/.exec(auth);
  if(!match) return false;
  const hash=await digestToken(match[1]);
  const r=await env.SESSIONS_DB.prepare('UPDATE sessions SET revoked_at=? WHERE token_hash=? AND revoked_at IS NULL').bind(now,hash).run();
  return (r.meta?.changes||0)>0;
}
