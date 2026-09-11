export function normalizePhone(raw: string | null | undefined): string {
  if (!raw) return raw as string;
  let n = String(raw).replace(/[\s\-\(\)]/g, '');
  if (/^\+\d{7,15}$/.test(n)) return n;
  if (/^[6-9]\d{9}$/.test(n)) return '+91' + n;
  if (/^0([6-9]\d{9})$/.test(n)) return '+91' + n.slice(1);
  if (/^91([6-9]\d{9})$/.test(n)) return '+' + n;
  return n;
}

export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return raw as string;
  const n = normalizePhone(raw);
  const ind = n.match(/^\+91([6-9]\d{4})(\d{5})$/);
  if (ind) return `+91 ${ind[1]} ${ind[2]}`;
  const us = n.match(/^\+1(\d{3})(\d{3})(\d{4})$/);
  if (us) return `+1 ${us[1]} ${us[2]} ${us[3]}`;
  return n;
}
