// Small shared helpers.

const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

export function mount(html) {
  const app = document.getElementById('app');
  app.innerHTML = html;
  return app.firstElementChild;
}

export const SKY = `<img class="skyline" src="/perth-skyline.webp" alt="" aria-hidden="true">`;
export const BACK = `<button class="btn btn-ghost back" data-action="home">← Back</button>`;

// iPads, phones and Android tablets bring a better keyboard of their own; the
// built-in one is for the Windows touch screen. (iPadOS reports itself as a Mac.)
export const hasOwnKeyboard = () =>
  /iPhone|iPad|Android/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// A QR card for one of the config links. It's also a link, for people on their
// own phone who can't scan their own screen; booth devices switch that off in CSS.
export const qrCard = (links, { key, label, caption }) =>
  links[key]
    ? `<a class="qr-card" href="${esc(links[key])}" target="_blank" rel="noopener">
         <img src="api/qr/${key}.svg" alt="QR code">
         <div><strong>${esc(label ?? 'Scan me')}</strong><span>${esc(caption ?? links[key].replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, ''))}</span></div>
       </a>`
    : '';

export async function api(path, { method = 'GET', body } = {}) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw Object.assign(new Error('Request failed'), { status: res.status, data });
  return data;
}

export function toast(message, ms = 3000) {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.setAttribute('role', 'alert');
  el.textContent = message;
  document.body.append(el);
  setTimeout(() => el.remove(), ms);
}

// Renders a text field. Emails are type=text so the on-screen keyboard can
// use setRangeText (which browsers disallow on type=email).
export function textField({ name, label, type, required, max, short }, value = '') {
  const tag = type === 'textarea' ? 'textarea' : 'input';
  const attrs = [
    `id="f-${name}"`,
    `name="${name}"`,
    `maxlength="${max ?? 200}"`,
    `autocomplete="off"`,
    `autocorrect="off"`,
    `spellcheck="false"`,
    `data-kind="${type}"`,
    type === 'email' ? 'autocapitalize="off"' : '',
  ].join(' ');
  const control =
    tag === 'textarea'
      ? `<textarea ${attrs}>${esc(value)}</textarea>`
      : `<input type="text" ${attrs} value="${esc(value)}">`;
  return `
    <div class="field${short ? ' field-short' : ''}" data-field="${name}">
      <label for="f-${name}">${esc(label)}${required ? ' <span class="req">*</span>' : ''}</label>
      ${control}
      <div class="error" role="alert"></div>
    </div>`;
}

export function chipsField({ name, label, required, options, type }) {
  return `
    <div class="field" data-field="${name}" data-chips="${type}">
      <span class="label">${esc(label)}${required ? ' <span class="req">*</span>' : ''}</span>
      <div class="chips">
        ${options.map((o) => `<button type="button" class="chip" aria-pressed="false" data-value="${esc(o)}">${esc(o)}</button>`).join('')}
      </div>
      <div class="error" role="alert"></div>
    </div>`;
}

// An opt-in tickbox. It always starts unticked: Australia's Spam Act doesn't
// count a pre-ticked box as consent to marketing email.
export function consentField(text, name = 'updates') {
  return `
    <button type="button" class="consent" data-field="${name}" aria-pressed="false">
      <span class="box" aria-hidden="true">✓</span>
      <span>${esc(text)}</span>
    </button>`;
}

// Wires chip toggling + consent inside a root element.
export function wireChoices(root) {
  root.addEventListener('click', (e) => {
    const chip = e.target.closest('.chip');
    if (chip) {
      const group = chip.closest('[data-chips]');
      const single = group.dataset.chips === 'chips';
      const on = chip.getAttribute('aria-pressed') !== 'true';
      if (single) group.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', 'false'));
      chip.setAttribute('aria-pressed', String(on));
      return;
    }
    const consent = e.target.closest('.consent');
    if (consent) {
      consent.setAttribute('aria-pressed', String(consent.getAttribute('aria-pressed') !== 'true'));
      consent.classList.remove('has-error');
    }
  });
  root.addEventListener('input', (e) => e.target.closest('.field')?.classList.remove('has-error'));
}

export function readChoices(root) {
  const out = {};
  root.querySelectorAll('[data-chips]').forEach((group) => {
    const picked = [...group.querySelectorAll('.chip[aria-pressed="true"]')].map((c) => c.dataset.value);
    out[group.dataset.field] = group.dataset.chips === 'chips' ? picked[0] ?? '' : picked;
  });
  root.querySelectorAll('input, textarea').forEach((f) => (out[f.name] = f.value));
  root.querySelectorAll('.consent').forEach((c) => (out[c.dataset.field] = c.getAttribute('aria-pressed') === 'true'));
  return out;
}

// Where a form shows errors that don't belong to one field (the API's `_form`,
// for instance). Empty, it takes no space.
export const formError = () => `<div class="form-error" role="alert" data-form-error></div>`;

// Shows { fieldName: message } against the matching fields. A key with no
// field goes in the form's formError() slot, or a toast if the form has none,
// so a rejection is never silently dropped.
export function showErrors(root, errors) {
  root.querySelectorAll('.has-error').forEach((f) => f.classList.remove('has-error'));
  root.querySelectorAll('.field .error, [data-form-error]').forEach((e) => (e.textContent = ''));
  let first = null;
  const general = [];
  for (const [name, msg] of Object.entries(errors)) {
    const field = root.querySelector(`[data-field="${name}"]`);
    if (!field) {
      general.push(msg);
      continue;
    }
    field.classList.add('has-error');
    const slot = field.querySelector('.error');
    if (slot) slot.textContent = msg;
    first ??= field;
  }
  if (general.length) {
    const slot = root.querySelector('[data-form-error]');
    if (slot) {
      slot.textContent = general.join(' ');
      first ??= slot;
    } else {
      toast(general.join(' '));
    }
  }
  first?.scrollIntoView({ block: 'center', behavior: 'smooth' });
}
