// Splits a question paper into separate questions: "12." starts a question,
// "a)", "b." or "(c)" starts an option, "Ans: b" after a question sets its
// answer, and an "Answer Key" section at the end is read if filled in.
//
// Splitting reads the text as one stream, so it works the same whether line
// breaks survived (PDF) or not (text pasted from a PDF viewer). A marker only
// counts when it is the one expected next:
//   - a question number must be the next in sequence (15 → 16), or 1 when the
//     numbering restarts, so "2", "2.5" or "24 hr" inside an option never
//     start a question;
//   - an option letter must be the next letter (a → b → c), so a stray "b."
//     in the middle of a sentence is ignored.
const MARKER = /(^|\s)(?:(?:Q\.?\s*)?(\d{1,4})\s*[.)]|\(?([a-hA-H])\s*[).])(?=\s|$)/g;
const INLINE_ANSWER = /\s*\b(?:ans(?:wer)?|correct(?:\s+answer)?)\s*[:.\-]?\s*\(?([a-h])\)?\.?\s*$/i;
const KEY_HEADING = /\banswer\s*key\b/i;

const toIndex = (letter) => letter.toLowerCase().charCodeAt(0) - 97;
const tidy = (text) => text.replace(/\s+/g, ' ').trim();

export function parseQuestions(text) {
  const all = String(text || '');
  const keyAt = all.search(KEY_HEADING);
  const body = keyAt >= 0 ? all.slice(0, keyAt) : all;
  const keyText = keyAt >= 0 ? all.slice(keyAt) : '';

  const questions = [];
  let current = null;
  let part = null; // { target: 'text' | option index, from: position }

  const close = (upTo) => {
    if (!current || !part) return;
    const chunk = body.slice(part.from, upTo);
    if (part.target === 'text') current.text += chunk;
    else current.options[part.target] += chunk;
  };

  for (const m of body.matchAll(MARKER)) {
    const at = m.index + m[1].length;
    const number = m[2] ? Number(m[2]) : null;
    const letter = m[3] ? m[3].toLowerCase() : null;

    // Right after "c)" the number is that option's text ("c) 3."), not a question.
    const optionStillEmpty = part && part.target !== 'text' && !body.slice(part.from, at).trim();
    const isNextQuestion = number !== null && !optionStillEmpty && (
      !current
      || number === current.number + 1
      || (number === 1 && current.options.length >= 2)
    );
    const isNextOption = letter !== null && current && toIndex(letter) === current.options.length;

    if (isNextQuestion) {
      close(at);
      current = { number, text: '', options: [], answer: null };
      questions.push(current);
      part = { target: 'text', from: at + m[0].length - m[1].length };
    } else if (isNextOption) {
      close(at);
      current.options.push('');
      part = { target: current.options.length - 1, from: at + m[0].length - m[1].length };
    }
  }
  close(body.length);

  for (const q of questions) {
    q.text = tidy(q.text);
    q.options = q.options.map(tidy);
    // "Ans: b" written after the last option (or after the question).
    const lastIndex = q.options.length - 1;
    const tail = lastIndex >= 0 ? q.options[lastIndex] : q.text;
    const found = tail.match(INLINE_ANSWER);
    if (found) {
      q.answer = toIndex(found[1]);
      if (lastIndex >= 0) q.options[lastIndex] = tidy(tail.slice(0, found.index));
      else q.text = tidy(tail.slice(0, found.index));
    }
  }

  // A filled-in answer key: "1. b", "2) c", "3 - a" … (blank keys are ignored).
  for (const m of keyText.matchAll(/(\d{1,4})\s*[.)\-:]\s*\(?([a-h])(?![a-z0-9])/gi)) {
    const q = questions.find((x) => x.number === Number(m[1]) && x.answer === null);
    if (q) q.answer = toIndex(m[2]);
  }

  return questions
    .filter((q) => q.text || q.options.length)
    .map((q) => ({ ...q, answer: q.answer !== null && q.answer < q.options.length ? q.answer : null }));
}

// Reads an answer key on its own: "1. b 2. c", "1-B", "1) (b)", "Q1: b", one
// per line or all on one line. Returns [{ number, answer }] in the order found.
export function parseAnswerKey(text) {
  const body = String(text || '').replace(/\banswer\s*key\b/gi, ' ');
  const out = [];
  for (const m of body.matchAll(/(?:^|[^a-z0-9])(?:q\.?\s*)?(\d{1,4})\s*[.):\-–]?\s*\(?([a-h])\)?(?![a-z0-9])/gi)) {
    out.push({ number: Number(m[1]), answer: m[2].toLowerCase().charCodeAt(0) - 97 });
  }
  return out;
}

// Fills in answers from a key. With restarted numbering, key entries are used
// in order: the first "1." in the key goes to the first question 1, and so on.
// Returns the updated questions and which numbers could not be matched.
export function applyAnswerKey(questions, key) {
  const used = new Set();
  const next = questions.map((q) => ({ ...q }));
  const unmatched = [];
  for (const entry of key) {
    const index = next.findIndex((q, i) => !used.has(i) && q.number === entry.number);
    if (index === -1 || entry.answer >= next[index].options.length) { unmatched.push(entry.number); continue; }
    used.add(index);
    next[index].answer = entry.answer;
    next[index].dirty = true;
  }
  const missing = next.filter((q, i) => !used.has(i)).map((q) => q.number);
  return { questions: next, applied: used.size, unmatched, missing };
}

// Problems worth a second look before saving.
export function questionWarnings(q) {
  const warnings = [];
  if (!q.text?.trim()) warnings.push('The question is empty.');
  if ((q.options || []).filter((o) => o.trim()).length < 2) warnings.push('Needs at least two options.');
  if ((q.options || []).some((o) => !o.trim())) warnings.push('An option is empty: fill it in or remove it.');
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
      rows.get(key).push({ x: item.transform[4], width: item.width || 0, str: item.str });
    }
    [...rows.entries()]
      .sort((a, b) => b[0] - a[0])
      .forEach(([, parts]) => {
        // Pieces that touch are one word ("requi" + "red"); a visible gap is a space.
        let line = '';
        let end = null;
        for (const part of parts.sort((a, b) => a.x - b.x)) {
          if (end !== null && part.x - end > 1) line += ' ';
          line += part.str;
          end = part.x + part.width;
        }
        out.push(line.replace(/\s+/g, ' ').trim());
      });
    out.push('');
  }
  return out.join('\n');
}
