import { readFileSync } from "node:fs";
import { strict as assert } from "node:assert";
import { test } from "node:test";
import { createRun, displayOptions, outcome, restore, selectIds, stats, submit, wrongQuestions } from "../quiz.mjs";
import { answerSpeech, questionSpeech, splitSpeech, voiceFor } from "../speech.mjs";

const bank = JSON.parse(readFileSync(new URL("../questions.json", import.meta.url), "utf8"));
const map = new Map(bank.map(q => [q.id, q]));
const deterministic = () => 0;
const range = (first, last) => Array.from({ length: last - first + 1 }, (_, index) => first + index);

test("110 câu theo đúng thứ tự, đủ 440 phương án và dòng đối chiếu", () => {
  assert.deepEqual(bank.map(q => q.id), range(1, 110));
  for (const question of bank) {
    assert.deepEqual(question.options.map(o => o.id), ["A", "B", "C", "D"]);
    assert(question.options.every(o => o.text.trim()));
    assert(question.explanation.trim());
    assert.equal(question.correct.length, 1);
    assert(question.options.some(o => question.correct.includes(o.id)));
  }
  for (const [id, correct] of [[1, "D"], [106, "A"], [108, "D"], [110, "B"]]) {
    assert.deepEqual(map.get(id).correct, [correct]);
  }
});

test("Bốn đề phủ toàn bộ câu hỏi và giữ nguyên thứ tự", () => {
  for (const [set, expected] of [["1",range(1,28)],["2",range(29,56)],["3",range(57,83)],["4",range(84,110)]]) {
    assert.deepEqual(selectIds(bank, set), expected);
  }
});

test("Bốn chế độ xáo thứ tự và chấm đúng cả 110 câu theo ID gốc", () => {
  for (const mode of ["original", "questions", "options", "both"]) {
    const run = createRun(bank, "all", mode, null, deterministic);
    assert.deepEqual([...run.ids].sort((a, b) => a - b), range(1, 110));
    assert.equal(run.ids[0] === 1, !["questions", "both"].includes(mode));
    for (const question of bank) {
      const options = displayOptions(question, run.order[question.id]);
      assert.deepEqual(options.map(o => o.letter), ["A", "B", "C", "D"]);
      const ordered = ["original", "questions"].includes(mode) || question.fixedOrder;
      assert.equal(run.order[question.id][0] === "A", Boolean(ordered));
      const right = options.find(option => question.correct.includes(option.id));
      const wrong = options.find(option => !question.correct.includes(option.id));
      assert.equal(outcome(question, right.id), "right");
      assert.equal(outcome(question, wrong.id), "wrong");
      assert(submit(run, question, right.id));
      assert(!submit(run, question, wrong.id));
    }
    assert.deepEqual(stats(run, map), { right: 110, wrong: 0, pending: 0, ungraded: 0, answered: 110 });
  }
});

test("Câu 105–108 giữ đúng tham chiếu của phương án tổng hợp khi đảo", () => {
  const run = createRun(bank, "4", "both", null, deterministic);
  assert.deepEqual(run.order[105], ["A", "B", "C", "D"]);
  assert.deepEqual(run.order[106], ["B", "A", "C", "D"]);
  assert.equal(run.order[107][3], "D");
  const options = displayOptions(map.get(108), run.order[108]);
  assert.deepEqual(options.map(o => o.id), ["B", "C", "A", "D"]);
  assert.equal(options[3].text, "Cả B và C");
});

test("Lọc câu sai, làm lại và khôi phục thứ tự, vị trí và kết quả", () => {
  const main = createRun(bank, "4", "both", null, deterministic);
  assert(submit(main, map.get(106), "B"));
  assert(submit(main, map.get(108), "D"));
  main.index = 12;
  assert.deepEqual(wrongQuestions(main, map), [106]);
  const retry = createRun(bank, "4", "both", wrongQuestions(main, map), deterministic);
  assert.equal(stats(retry, map).pending, 1);
  assert(submit(retry, map.get(106), "A"));
  const raw = JSON.stringify({ version: 1, main, retry, active: "retry", marks: [106], filter: "marked" });
  const saved = restore(JSON.parse(raw), bank);
  assert.equal(saved.active, "retry");
  assert.deepEqual(saved.main, main);
  assert.deepEqual(saved.retry, retry);
  assert.deepEqual(saved.marks, [106]);
  assert.equal(restore({ version: 1, main: { ...main, ids: [] } }, bank), null);
});

test("Đọc tiếng Việt, thuật ngữ Anh và chữ cái được hiển thị", () => {
  const result = splitSpeech("Điều phối CPU bằng Round Robin sẽ dùng tham số gì?");
  assert.deepEqual(result.map(part => part.lang), ["vi", "en", "vi", "en", "vi"]);
  assert.equal(result[1].text, "C P U");
  assert.equal(result[3].text, "Round Robin");
  const option = { letter: "C", text: "Hàng đợi sẵn sàng (ready queue)" };
  assert.equal(questionSpeech("Chọn mục phù hợp.", [option], false).length, 1);
  assert.deepEqual(answerSpeech([option]).map(part => part.text),
    ["Đáp án đúng là", "xê.", "Hàng đợi sẵn sàng (", "ready queue"]);
  const voices = [{lang:"vi-VN", voiceURI:"system", name:"Hệ thống", default:true},
    {lang:"vi-VN", voiceURI:"google", name:"Google tiếng Việt"}];
  assert.equal(voiceFor(voices,"vi","").voiceURI, "google");
  assert.equal(voiceFor(voices,"vi","system").voiceURI, "system");
});

