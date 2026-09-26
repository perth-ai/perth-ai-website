// Single source of truth for the booth forms: what each asks, and how it's checked before sending.

// Consent, the Australian way (Spam Act 2003): following up on what someone
// asked for (an invite, a venue offer) needs no tickbox, but anything more,
// like event updates, needs a separate, optional, unticked opt-in. Forms whose
// whole point is updates (`subscribe: true`) are the opt-in themselves.
export const UPDATES_TEXT = 'Send me Perth AI event updates too. Unsubscribe any time.';
export const PRIVACY_NOTE = 'We’ll only use your details to follow up on this. Never sold or shared.';

export const FORMS = {
  slack: {
    title: 'Join the Slack',
    eyebrow: 'Stay in the loop',
    intro: 'Slack is where the day-to-day chat, job leads and event planning happen. Scan the code to join right now — or leave your details and we’ll send you an invite.',
    submitLabel: 'Send me an invite',
    thanks: 'Invite coming your way. Keep an eye on your inbox (and your spam folder, just in case).',
    qrs: [{ key: 'slack', label: 'Scan to join now', caption: 'Perth AI on Slack' }],
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      {
        name: 'role', label: 'Which best describes you?', type: 'chips',
        options: ['Builder / startup', 'Student', 'Product & engineering', 'AI-first enterprise', 'Just curious'],
      },
      { name: 'building', label: 'What are you building or exploring? (optional)', type: 'textarea', max: 500 },
    ],
  },

  events: {
    title: 'What’s on',
    eyebrow: 'Upcoming events',
    intro: 'Everything runs through Luma. Scan the code to subscribe — or leave your email and we’ll let you know about the next one.',
    submitLabel: 'Keep me posted',
    thanks: 'Done. You’ll hear about the next Perth AI event.',
    subscribe: true,
    note: 'We’ll email you about upcoming Perth AI events. Unsubscribe any time. Never sold or shared.',
    qrs: [{ key: 'luma', label: 'Scan to subscribe' }],
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      {
        name: 'interests', label: 'What would you come to?', type: 'multichips',
        options: ['Meet-ups', 'Co-building', 'Workshops', 'Networking', 'Big events', 'Touch grass'],
      },
    ],
  },

  idea: {
    title: 'Suggest an event',
    eyebrow: 'Get involved',
    intro: 'Want a dreamers session, a study group, a regular co-build? Tell us.',
    submitLabel: 'Send my idea',
    thanks: 'Love it. Someone from the team will be in touch.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      {
        name: 'format', label: 'What kind of thing?', type: 'chips',
        options: ['Meet-up', 'Co-building', 'Workshop', 'Networking', 'Pop-up', 'Big event', 'Touch grass', 'Mini group / recurring', 'Something else'],
      },
      { name: 'idea', label: 'Tell us about it', type: 'textarea', required: true, max: 1000 },
      {
        name: 'help', label: 'Would you help organise it?', type: 'chips',
        options: ['Yes, happy to help', 'Maybe', 'No — just want it to exist'],
      },
    ],
  },

  space: {
    title: 'Offer a space',
    eyebrow: 'Our biggest constraint',
    intro: 'Got a room that fits 40 people on a weeknight? That solves our biggest problem.',
    submitLabel: 'Offer my space',
    thanks: 'Legend. We’ll reach out to sort out the details.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'organisation', label: 'Organisation', type: 'text', required: true, max: 120 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      { name: 'suburb', label: 'Suburb / area', type: 'text', max: 80 },
      { name: 'capacity', label: 'Roughly how many people?', type: 'chips', options: ['Under 30', '30–50', '50–100', '100+'] },
      { name: 'detail', label: 'Anything else? (AV, parking, times…)', type: 'textarea', max: 1000 },
    ],
  },

  sponsor: {
    title: 'Sponsor Perth AI',
    eyebrow: 'Keep events free',
    intro: 'Sponsors keep every Perth AI event free for everyone. Tell us what you could help with.',
    submitLabel: 'Let’s talk',
    thanks: 'Thank you! We’ll be in touch soon.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'organisation', label: 'Organisation', type: 'text', required: true, max: 120 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      {
        name: 'offering', label: 'What could you offer?', type: 'multichips',
        options: ['A venue', 'Paid sponsorship', 'Food and drinks', 'Prizes, hardware or credits', 'Not sure yet — let’s talk'],
      },
      { name: 'detail', label: 'Any detail that helps', type: 'textarea', max: 1000 },
    ],
  },

  // AI Disrupt 2026 — reached from the AI Disrupt screen (`parent: 'summit'`).
  summitSponsor: {
    parent: 'summit',
    title: 'Sponsor AI Disrupt',
    eyebrow: 'AI Disrupt 2026',
    intro: 'AI Disrupt is free to attend, which only works because sponsors cover the venue, food and prizes. Tell us how you’d like to be involved in the next one.',
    submitLabel: 'Register interest',
    thanks: 'Thank you! Someone from the AI Disrupt team will be in touch about sponsoring.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'organisation', label: 'Organisation', type: 'text', required: true, max: 120 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      {
        name: 'offering', label: 'What could you support?', type: 'multichips',
        options: ['Headline sponsor', 'Venue', 'Food and drinks', 'Hackathon prizes', 'Credits or tools', 'Not sure yet — let’s talk'],
      },
      { name: 'detail', label: 'Anything else we should know?', type: 'textarea', max: 1000 },
    ],
  },

  // Venue sponsors are a focus for 2026, so they get their own way in rather than a chip on the sponsor form.
  summitVenue: {
    parent: 'summit',
    title: 'Host AI Disrupt',
    eyebrow: 'Venue sponsor',
    intro: 'AI Disrupt needs a main room, space for a startup expo and hackathon tables, and somewhere to catch up afterwards. If your organisation has the space, we’d love to talk.',
    submitLabel: 'Offer our venue',
    thanks: 'Thank you! Someone from the AI Disrupt team will be in touch about the venue.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'organisation', label: 'Organisation', type: 'text', required: true, max: 120 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      { name: 'venue', label: 'Venue name and suburb', type: 'text', max: 160 },
      { name: 'capacity', label: 'Roughly how many people?', type: 'chips', options: ['Up to 150', '150–300', '300+', 'Not sure'] },
      {
        name: 'spaces', label: 'What’s there?', type: 'multichips',
        options: ['Main room or auditorium', 'Breakout rooms', 'Expo space', 'Outdoor area', 'AV and staging', 'Catering'],
      },
      { name: 'detail', label: 'Anything else we should know?', type: 'textarea', max: 1000 },
    ],
  },

  summitSpeak: {
    parent: 'summit',
    title: 'Speak or demo',
    eyebrow: 'Call for speakers',
    intro: 'Built something, learned something the hard way, or have a demo people should see? We want speakers from first-timers to veterans.',
    submitLabel: 'Submit my idea',
    thanks: 'Thanks for putting your hand up! We’ll be in touch when we’re putting the programme together.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      { name: 'talk', label: 'Talk or demo title', type: 'text', required: true, max: 120 },
      { name: 'abstract', label: 'What’s it about?', type: 'textarea', required: true, max: 1000 },
      { name: 'format', label: 'Format', type: 'chips', options: ['Talk', 'Lightning talk', 'Demo', 'Workshop', 'Panel'] },
      { name: 'event', label: 'Where would you like to speak?', type: 'chips', options: ['AI Disrupt 2026', 'A Perth AI meet-up', 'Either'] },
      { name: 'link', label: 'LinkedIn or website (optional)', type: 'text', max: 200 },
    ],
  },

  summitNotify: {
    parent: 'summit',
    title: 'AI Disrupt updates',
    eyebrow: 'AI Disrupt 2026',
    intro: 'December 2026 — no date, venue or tickets locked in yet. Leave your details and you’ll hear first.',
    submitLabel: 'Keep me posted',
    thanks: 'Done. You’ll hear about AI Disrupt 2026 as soon as there’s a date.',
    subscribe: true,
    note: 'We’ll email you about AI Disrupt 2026. Unsubscribe any time. Never sold or shared.',
    fields: [
      { name: 'name', label: 'Your name', type: 'text', required: true, max: 80 },
      { name: 'email', label: 'Email', type: 'email', required: true, max: 120 },
      {
        name: 'interests', label: 'What are you keen on?', type: 'multichips',
        options: ['Attending', 'Startup expo table', 'Hackathon', 'Workshops', 'Volunteering'],
      },
    ],
  },
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isEmail(value) {
  return EMAIL_RE.test(String(value || '').trim());
}

// Returns { ok, errors, clean } — clean contains only known fields, trimmed and capped.
export function validateForm(formId, data) {
  const form = FORMS[formId];
  if (!form) return { ok: false, errors: { _form: 'Unknown form' } };
  const errors = {};
  const clean = {};
  for (const field of form.fields) {
    let value = data?.[field.name];
    if (field.type === 'multichips') {
      value = Array.isArray(value) ? value.filter((v) => field.options.includes(v)) : [];
      if (field.required && !value.length) errors[field.name] = 'Pick at least one';
      clean[field.name] = value;
      continue;
    }
    value = String(value ?? '').trim().slice(0, field.max ?? 200);
    if (field.type === 'chips' && value && !field.options.includes(value)) value = '';
    if (field.required && !value) errors[field.name] = 'Required';
    else if (field.type === 'email' && value && !isEmail(value)) errors[field.name] = 'That email doesn’t look right';
    clean[field.name] = value;
  }
  // Opted in to event updates? Subscribe forms are the opt-in; elsewhere it's the tickbox.
  clean.updates = form.subscribe === true || data?.updates === true;
  return { ok: Object.keys(errors).length === 0, errors, clean };
}
