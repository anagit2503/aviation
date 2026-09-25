// Splits a question paper into separate questions.
//
// Rules: a line starting with a number ("1.", "2)") is a new question; a line
// starting with a letter a–h ("a)", "b.", "(c)") is an option. Expected layout:
//   12. Question text, which may wrap
//       onto a second line
//   a) First option
//   b) Second option, which may also wrap
//   Ans: b                      ← optional
// An "Answer Key" section at the end ("1. b", "2. c", …) is read if filled in and
// ignored if blank. Anything before question 1, like the paper's title, is skipped.

const QUESTION = /^(?:Q\.?\s*)?(\d{1,4})\s*[.)]\s+(.+)$/i;
const OPTION = /^\(?([a-h])\s*[).]\s*(.*)$/i;
const INLINE_ANSWER = /^(?:ans(?:wer)?|correct(?:\s+answer)?)\s*[:.-]?\s*\(?([a-h])\b/i;
const KEY_HEADING = /^answer\s*key\b/i;

export function parseQuestions(text) {
  const lines = String(text || '').split(/\r?\n/).map((l) => l.replace(/\s+/g, ' ').trim());
  const keyStart = lines.findIndex((l) => KEY_HEADING.test(l));
  const body = keyStart >= 0 ? lines.slice(0, keyStart) : lines;
  const keyText = keyStart >= 0 ? lines.slice(keyStart + 1).join(' ') : '';

  const questions = [];
  let current = null;
  let last = null; // 'question' | 'option', so wrapped lines join the right part

  for (const line of body) {
    if (!line) continue;

    const answer = current && line.match(INLINE_ANSWER);
    if (answer) {
      current.answer = answer[1].toLowerCase().charCodeAt(0) - 97;
      continue;
    }

    const option = current && line.match(OPTION);
    if (option && option[2]) {
      current.options.push(option[2]);
      last = 'option';
      continue;
    }

    // Every numbered line ("1.", "2.", "3." …) starts a new question, even if
    // the numbering restarts part-way through a file.
    const question = line.match(QUESTION);
    if (question) {
      current = { number: Number(question[1]), text: question[2], options: [], answer: null };
      questions.push(current);
      last = 'question';
      continue;
    }

    if (!current) continue; // title or heading before question 1
    if (last === 'option') current.options[current.options.length - 1] += ` ${line}`;
    else current.text += ` ${line}`;
  }

  // A filled-in answer key: "1. b", "2) c", "3 - a" …
  for (const m of keyText.matchAll(/(\d{1,4})\s*[.)\-:]\s*\(?([a-h])(?![a-z0-9])/gi)) {
    const q = questions.find((x) => x.number === Number(m[1]) && x.answer === null);
    if (q && q.answer === null) q.answer = m[2].toLowerCase().charCodeAt(0) - 97;
  }

  return questions.map((q) => ({
    ...q,
    answer: q.answer !== null && q.answer < q.options.length ? q.answer : null,
  }));
}

// Problems worth a second look before saving.
export function questionWarnings(q) {
  const warnings = [];
  if (!q.text?.trim()) warnings.push('The question is empty.');
  if ((q.options || []).filter((o) => o.trim()).length < 2) warnings.push('Needs at least two options.');
  const seen = new Set();
  for (const o of q.options || []) {
    const key = o.trim().toLowerCase();
    if (key && seen.has(key)) { warnings.push('Two options are the same.'); break; }
    seen.add(key);
  }
  if (q.answer === null || q.answer === undefined) warnings.push('Pick the correct answer.');
  return warnings;
}

// PDF → plain text with one line per printed line. Loaded only when needed.
export async function pdfToText(file) {
  const pdfjs = await import('pdfjs-dist');
  const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
  pdfjs.GlobalWorkerOptions.workerSrc = worker.default;

  const pdf = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
  const out = [];
  for (let p = 1; p <= pdf.numPages; p += 1) {
    const page = await pdf.getPage(p);
    const { items } = await page.getTextContent();
    // Group text pieces by their height on the page, then read each row left to right.
    const rows = new Map();
    for (const item of items) {
      if (!item.str) continue;
      const y = Math.round(item.transform[5]);
      const key = [...rows.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!rows.has(key)) rows.set(key, []);
      rows.get(key).push({ x: item.transform[4], str: item.str });
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, parts]) => {
        out.push(parts.sort((a, b) => a.x - b.x).map((part) => part.str).join(' ').replace(/\s+/g, ' ').trim());
      });
    out.push('');
  }
  return out.join('\n');
}
