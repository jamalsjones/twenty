import { type ResponseRecord } from './assessments';

const escapeHtml = (value: string | null | undefined) =>
  (value ?? '').replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        character
      ] ?? character,
  );

const ANSWER_OPTIONS = [
  ['YES', 'Yes'],
  ['PARTIAL', 'Partially'],
  ['NO', 'No'],
  ['NOT_APPLICABLE', 'Not applicable'],
] as const;

const STYLES = `
  :root { color-scheme: light dark; --ink: #1b1b1b; --muted: #6b6b6b; --line: #e3e3e3; --surface: #fff; --page: #f6f6f4; --accent: #2f5fd0; }
  @media (prefers-color-scheme: dark) { :root { --ink: #ededed; --muted: #9a9a9a; --line: #333; --surface: #1e1e1e; --page: #141414; --accent: #7aa2ff; } }
  * { box-sizing: border-box; }
  body { margin: 0; background: var(--page); color: var(--ink); font: 15px/1.5 system-ui, -apple-system, "Segoe UI", sans-serif; }
  main { max-width: 760px; margin: 0 auto; padding: 32px 16px 96px; }
  h1 { font-size: 24px; margin: 0 0 4px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .05em; color: var(--muted); margin: 32px 0 8px; }
  p.lead { color: var(--muted); margin: 0 0 8px; }
  fieldset { border: 1px solid var(--line); border-radius: 8px; background: var(--surface); padding: 16px; margin: 0 0 8px; }
  legend { float: left; width: 100%; padding: 0; margin-bottom: 10px; font-weight: 500; }
  legend span { color: var(--muted); font-weight: 400; margin-right: 8px; }
  .options { display: flex; flex-wrap: wrap; gap: 8px; clear: both; }
  .options label { border: 1px solid var(--line); border-radius: 999px; padding: 4px 12px; cursor: pointer; }
  .options input { position: absolute; opacity: 0; }
  .options label:has(input:checked) { border-color: var(--accent); background: var(--accent); color: #fff; }
  .options label:has(input:focus-visible) { outline: 2px solid var(--accent); outline-offset: 2px; }
  textarea { width: 100%; margin-top: 10px; min-height: 38px; border: 1px solid var(--line); border-radius: 6px; padding: 8px; font: inherit; background: transparent; color: inherit; }
  footer { position: fixed; inset: auto 0 0 0; background: var(--surface); border-top: 1px solid var(--line); padding: 12px 16px; }
  footer div { max-width: 760px; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 12px; }
  button { background: var(--accent); color: #fff; border: 0; border-radius: 6px; padding: 9px 18px; font: inherit; font-weight: 500; cursor: pointer; }
  button:disabled { opacity: .5; cursor: default; }
  #status { color: var(--muted); }
`;

const SCRIPT = `
  const form = document.querySelector('form');
  const status = document.querySelector('#status');
  const button = document.querySelector('button');
  const total = document.querySelectorAll('fieldset').length;
  const countAnswered = () => new Set([...form.querySelectorAll('input:checked')].map((input) => input.name)).size;
  const refresh = () => { status.textContent = countAnswered() + ' of ' + total + ' answered'; };
  form.addEventListener('change', refresh);
  refresh();
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    button.disabled = true;
    status.textContent = 'Submitting…';
    const answers = [...form.querySelectorAll('fieldset')].map((fieldset) => ({
      id: fieldset.dataset.id,
      answer: fieldset.querySelector('input:checked')?.value ?? 'UNANSWERED',
      comment: fieldset.querySelector('textarea').value,
    }));
    const response = await fetch(window.location.href, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ answers }),
    });
    if (response.ok) {
      document.querySelector('main').innerHTML = '<h1>Thank you</h1><p class="lead">Your answers were submitted. You can close this page; the review team will be in touch if anything needs follow-up.</p>';
      document.querySelector('footer').remove();
    } else {
      button.disabled = false;
      status.textContent = 'Submission failed. Please try again.';
    }
  });
`;

const page = (title: string, body: string) =>
  `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>${STYLES}</style></head><body>${body}</body></html>`;

export const renderMessagePage = (title: string, message: string) =>
  page(
    title,
    `<main><h1>${escapeHtml(title)}</h1><p class="lead">${escapeHtml(message)}</p></main>`,
  );

export const renderQuestionnairePage = (
  vendorName: string,
  responses: ResponseRecord[],
) => {
  const sections = [
    ...new Set(responses.map((response) => response.section ?? 'General')),
  ];
  const renderQuestion = (response: ResponseRecord) => `
    <fieldset data-id="${escapeHtml(response.id)}">
      <legend><span>${escapeHtml(response.name)}</span>${escapeHtml(response.question)}</legend>
      <div class="options">${ANSWER_OPTIONS.map(
        ([value, label]) =>
          `<label><input type="radio" name="${escapeHtml(response.id)}" value="${value}"${response.answer === value ? ' checked' : ''}>${label}</label>`,
      ).join('')}</div>
      <textarea placeholder="Add context or a link to supporting evidence (optional)">${escapeHtml(response.comment)}</textarea>
    </fieldset>`;

  return page(
    'Security questionnaire',
    `<main>
      <h1>Security questionnaire</h1>
      <p class="lead">For ${escapeHtml(vendorName)}. Answer each statement as it applies to your organization today. Your progress is saved when you submit.</p>
      <form>${sections
        .map(
          (section) =>
            `<h2>${escapeHtml(section)}</h2>${responses
              .filter((response) => (response.section ?? 'General') === section)
              .map(renderQuestion)
              .join('')}`,
        )
        .join('')}</form>
    </main>
    <footer><div><span id="status"></span><button type="submit" form="questionnaire">Submit answers</button></div></footer>
    <script>${SCRIPT}</script>`.replace('<form>', '<form id="questionnaire">'),
  );
};
