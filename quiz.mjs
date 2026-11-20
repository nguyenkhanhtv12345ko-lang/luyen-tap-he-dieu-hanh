export const letters = "ABCD";
export const modes = ["original", "questions", "options", "both"];
export const sets = ["all", "1", "2", "3", "4"];
export const questionCount = 110;
const setBounds = [0, 28, 56, 83, questionCount];

export function selectIds(bank, set) {
  if (set === "all") return bank.map(q => q.id);
  const index = Number(set);
  return bank.slice(setBounds[index - 1], setBounds[index]).map(q => q.id);
}

export function shuffle(list, random = Math.random) {
  const items = [...list];
  for (let end = items.length - 1; end > 0; end--) {
    const other = Math.floor(random() * (end + 1));
    [items[end], items[other]] = [items[other], items[end]];
  }
  return items;
}

export function createRun(bank, set, mode, subset = null, random = Math.random) {
  const map = new Map(bank.map(q => [q.id, q]));
  const original = subset || selectIds(bank, set);
  const ids = ["questions", "both"].includes(mode) ? shuffle(original, random) : [...original];
  const order = {};
  for (const id of ids) {
    const question = map.get(id);
    const shouldShuffle = ["options", "both"].includes(mode) && !question.fixedOrder;
    const movable = shouldShuffle ? shuffle(question.options.filter(o => !o.fixedPosition), random) : [];
    order[id] = question.options.map(option =>
      (shouldShuffle && !option.fixedPosition ? movable.shift() : option).id
    );
  }
  return { set, mode, ids, order, answers: {}, index: 0 };
}

export function displayOptions(question, order) {
  const letterForId = id => letters[order.indexOf(id)];
  return order.map((id, index) => {
    const original = question.options.find(o => o.id === id);
    const references = question.references?.[id];
    const text = references
      ? original.text.replace(references.join(" và "), references.map(letterForId).sort().join(" và "))
      : original.text;
    return { id, letter: letters[index], text };
  });
}

export function outcome(question, answer) {
  if (!answer) return "pending";
  if (!question.correct.length) return "ungraded";
  return question.correct.includes(answer) ? "right" : "wrong";
}

export function submit(run, question, optionId) {
  if (run.answers[question.id] || !run.order[question.id]?.includes(optionId)) return false;
  run.answers[question.id] = optionId;
  return true;
}

export function stats(run, map) {
  const count = { right: 0, wrong: 0, pending: 0, ungraded: 0 };
  for (const id of run.ids) count[outcome(map.get(id), run.answers[id])]++;
  return { ...count, answered: run.ids.length - count.pending };
}

export function wrongQuestions(run, map) {
  return run.ids.filter(id => outcome(map.get(id), run.answers[id]) === "wrong");
}

export function restore(raw, bank) {
  if (!raw || raw.version !== 1) return null;
  const map = new Map(bank.map(q => [q.id, q]));
  const validRun = (run, subset) => {
    if (!run || !sets.includes(run.set) || !modes.includes(run.mode)) return false;
    if (!Array.isArray(run.ids) || !run.ids.length || new Set(run.ids).size !== run.ids.length) return false;
    const allowed = selectIds(bank, run.set);
    if (!subset && run.ids.length !== allowed.length) return false;
    if (!run.ids.every(id => allowed.includes(id))) return false;
    if (!Number.isInteger(run.index) || !run.ids[run.index] || !run.order || !run.answers) return false;
    return run.ids.every(id => {
      const options = map.get(id).options.map(option => option.id);
      const order = run.order[id];
      if (!Array.isArray(order) || order.length !== options.length || new Set(order).size !== order.length) return false;
      return order.every(key => options.includes(key)) && (!run.answers[id] || order.includes(run.answers[id]));
    });
  };
  if (!validRun(raw.main, false)) return null;
  if (!validRun(raw.retry, true) || raw.retry?.set !== raw.main.set) raw.retry = null;
  raw.active = raw.active === "retry" && raw.retry ? "retry" : "main";
  raw.marks = Array.isArray(raw.marks) ? [...new Set(raw.marks)].filter(id => map.has(id)) : [];
  if (!["all", "pending", "wrong", "review", "marked"].includes(raw.filter)) raw.filter = "all";
  const { version, main, retry, active, marks, filter } = raw;
  return { version, main, retry, active, marks, filter };
}

