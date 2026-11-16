// Pure permission workflow business rules. No database or auth bypass.
// NOT a deployable Worker. Identity must be verified server-side.
export const STATUSES = Object.freeze(['pending','approved','rejected']);
export function validateRequest(input) {
  if (!input || typeof input !== 'object') throw new Error('INVALID_REQUEST');
  const from = Date.parse(input.from_time), to = Date.parse(input.to_time);
  if (!Number.isFinite(from) || !Number.isFinite(to) || to <= from || to - from > 31*86400000) throw new Error('INVALID_INTERVAL');
  const reason = String(input.reason ?? '').trim();
  if (!reason || reason.length > 1000) throw new Error('INVALID_REASON');
  if (!/[zZ]|[+-]\d\d:\d\d$/.test(input.from_time) || !/[zZ]|[+-]\d\d:\d\d$/.test(input.to_time)) throw new Error('TIMEZONE_REQUIRED');
  return {from_time:new Date(from).toISOString(),to_time:new Date(to).toISOString(),reason};
}
export function mayReview(actor, employee, request) {
  // Actor/employee MUST be server verified; browser-supplied roles are untrusted.
  if (!actor || !employee || !request || request.status !== 'pending') return false;
  if (!actor.workerId || !employee.workerId || actor.workerId === employee.workerId) return false;
  if (employee.role === 'head') return actor.role === 'director';
  if (employee.role === 'employee') return actor.role === 'head' && !!actor.department && actor.department === employee.department;
  return false;
}
export function approvedMinutesInShift(intervals, shiftStart, shiftEnd) {
  const start=Date.parse(shiftStart), end=Date.parse(shiftEnd);
  if (!Number.isFinite(start)||!Number.isFinite(end)||end<=start) throw new Error('INVALID_SHIFT');
  const xs=intervals.filter(x=>x.status==='approved').map(x=>[Math.max(start,Date.parse(x.from_time)),Math.min(end,Date.parse(x.to_time))]).filter(([a,b])=>Number.isFinite(a)&&Number.isFinite(b)&&b>a).sort((a,b)=>a[0]-b[0]);
  let total=0, last=start;
  for (const [a,b] of xs) {total+=Math.max(0,b-Math.max(a,last));last=Math.max(last,b)}
  return Math.round(total/60000);
}
