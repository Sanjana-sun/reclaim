const OT = {
  token() { return localStorage.getItem('ot_token'); },
  user() { try { return JSON.parse(localStorage.getItem('ot_user')); } catch (e) { return null; } },
  setAuth(token, user) { localStorage.setItem('ot_token', token); localStorage.setItem('ot_user', JSON.stringify(user)); },
  logout() { localStorage.removeItem('ot_token'); localStorage.removeItem('ot_user'); location.href = '/login.html'; },
  async api(path, opts = {}) {
    const res = await fetch('/api' + path, {
      method: opts.method || 'GET',
      headers: { 'content-type': 'application/json', ...(this.token() ? { authorization: 'Bearer ' + this.token() } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
    let data = {};
    try { data = await res.json(); } catch (e) {}
    if (res.status === 401) { this.logout(); throw new Error('Not authenticated'); }
    if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
    return data;
  },
  guard(roles) {
    const u = this.user();
    if (!u || !this.token()) { location.href = '/login.html'; return null; }
    if (roles && !roles.includes(u.role)) { location.href = home(u.role); return null; }
    return u;
  },
  money(n) { return '$' + Math.round(n || 0).toLocaleString(); },
  esc(s) { return String(s == null ? '' : s).replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c])); },
  toast(msg) {
    const t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;left:50%;transform:translateX(-50%);background:#0d1f1a;color:#fff;padding:12px 20px;border-radius:10px;box-shadow:0 10px 30px rgba(0,0,0,.25);z-index:200;font-size:14px;font-weight:500;';
    document.body.appendChild(t);
    setTimeout(() => { t.style.transition = 'opacity .4s'; t.style.opacity = '0'; setTimeout(() => t.remove(), 400); }, 2200);
  },
};
function home(role) {
  return { consumer: '/dashboard.html', provider: '/provider.html', pharma: '/pharma.html', employer: '/employer.html', clinician: '/clinician.html', admin: '/admin.html' }[role] || '/dashboard.html';
}
const LOGO = '<span class="logo"><svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M9 12l2 2 4-4"/><path d="M21 12c0 5-3.5 7.5-8.5 9C7.5 19.5 4 17 4 12V6l8-3 8 3z" fill="none"/></svg></span>';
// Optional privacy-friendly analytics — loads only if ANALYTICS_* env vars are set.
(function () {
  fetch('/api/public/config').then((r) => r.json()).then((c) => {
    if (c && c.analyticsDomain && c.analyticsSrc) {
      const s = document.createElement('script');
      s.defer = true; s.setAttribute('data-domain', c.analyticsDomain); s.src = c.analyticsSrc;
      document.head.appendChild(s);
    }
  }).catch(() => {});
})();
function navBar(u) {
  const links = { consumer: [['/dashboard.html', 'Dashboard'], ['/account.html', 'Account']], provider: [['/provider.html', 'Portal']], pharma: [['/pharma.html', 'Programs']], employer: [['/employer.html', 'Benefits']], clinician: [['/clinician.html', 'Review queue']], admin: [['/admin.html', 'Metrics']] }[u.role] || [];
  return `<header class="nav"><div class="container nav-inner">
    <a class="brand" href="/">${LOGO}Over<b>turn</b></a>
    <nav class="nav-links">
      ${links.map((l) => `<a href="${l[0]}">${l[1]}</a>`).join('')}
      <span class="nav-user"><span class="avatar" style="width:28px;height:28px;font-size:12px;">${OT.esc((u.name || u.email)[0].toUpperCase())}</span><span class="hide-sm">${OT.esc(u.name || u.email)}</span></span>
      <a href="#" class="link" onclick="OT.logout();return false;">Log out</a>
    </nav></div></header>`;
}
