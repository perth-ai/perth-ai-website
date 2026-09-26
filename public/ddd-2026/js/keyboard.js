// Minimal on-screen keyboard. We don't rely on the Windows touch keyboard
// because it's inconsistent in Chrome kiosk mode.

const LETTERS = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l', "'"],
  ['{shift}', 'z', 'x', 'c', 'v', 'b', 'n', 'm', '-', '{bksp}'],
  ['@', '.', '{space}', '.com', '_', '{done}'],
];

const LABELS = { '{shift}': '⇧ Shift', '{bksp}': '⌫', '{space}': 'space', '{done}': 'Done ✓' };

let el;
let target = null;
let shift = false;

function isTextField(node) {
  return node instanceof HTMLTextAreaElement || (node instanceof HTMLInputElement && node.type === 'text');
}

function render() {
  el.innerHTML = LETTERS.map(
    (row) =>
      `<div class="osk-row">${row
        .map((k) => {
          const cls = ['osk-key'];
          if (k === '{shift}') cls.push('mod', 'wide', shift ? 'on' : '');
          if (k === '{bksp}') cls.push('mod', 'wide');
          if (k === '{space}') cls.push('space');
          if (k === '{done}') cls.push('done');
          if (k === '.com') cls.push('mod');
          const label = LABELS[k] ?? (shift && k.length === 1 ? k.toUpperCase() : k);
          return `<button type="button" class="${cls.join(' ')}" data-key="${k}">${label}</button>`;
        })
        .join('')}</div>`
  ).join('');
}

function insert(text) {
  if (!target) return;
  const max = target.maxLength > 0 ? target.maxLength : Infinity;
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  if (target.value.length - (end - start) + text.length > max) return;
  target.setRangeText(text, start, end, 'end');
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

function backspace() {
  if (!target) return;
  let start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? target.value.length;
  if (start === end) start = Math.max(0, start - 1);
  target.setRangeText('', start, end, 'end');
  target.dispatchEvent(new Event('input', { bubbles: true }));
}

function press(key) {
  if (key === '{shift}') {
    shift = !shift;
    render();
    return;
  }
  if (key === '{bksp}') return backspace();
  if (key === '{done}') return close(true);
  if (key === '{space}') return insert(' ');
  insert(shift && key.length === 1 ? key.toUpperCase() : key);
  if (shift) {
    shift = false;
    render();
  }
}

function open(field) {
  target = field;
  // Auto-capitalise the first letter of names and free text, not emails.
  shift = field.dataset.kind !== 'email' && field.value.length === 0;
  render();
  el.classList.add('open');
  document.documentElement.style.setProperty('--kb-height', `${el.offsetHeight}px`);
  // Let layout settle with the extra padding before scrolling the field into view.
  requestAnimationFrame(() => field.scrollIntoView({ block: 'center', behavior: 'smooth' }));
}

export function close(blur = false) {
  if (!el) return;
  el.classList.remove('open');
  document.documentElement.style.setProperty('--kb-height', '0px');
  if (blur && target) target.blur();
  target = null;
}

export function initKeyboard(enabled) {
  if (!enabled) return;
  el = document.createElement('div');
  el.className = 'osk';
  el.setAttribute('aria-hidden', 'true');
  document.body.append(el);

  // Keep focus in the field while tapping keys.
  el.addEventListener('pointerdown', (e) => {
    e.preventDefault();
    const key = e.target.closest('[data-key]');
    if (!key) return;
    key.classList.add('pressed');
    setTimeout(() => key.classList.remove('pressed'), 90);
    press(key.dataset.key);
  });

  document.addEventListener('focusin', (e) => {
    if (isTextField(e.target)) {
      e.target.setAttribute('inputmode', 'none'); // suppress the OS keyboard
      open(e.target);
    }
  });

  document.addEventListener('focusout', (e) => {
    // Hide only if focus isn't moving to another text field.
    setTimeout(() => {
      if (!isTextField(document.activeElement)) close();
    }, 0);
  });
}
