const labelSounds = { A: "a", B: "bê", C: "xê", D: "đê" };
const terms = [
  "Shortest Remaining Time First", "Multilevel Feedback Queue", "First Come, First Served",
  "Process Control Block", "Short-term Scheduler", "Long-term Scheduler", "Medium-term Scheduler",
  "Direct Memory Access", "Resource Allocation Graph", "Round Robin", "Test-and-Set",
  "Multilevel Queue", "Shortest Job First", "context switch", "CPU burst", "I/O burst",
  "ready queue", "device queue", "response time", "waiting time", "turnaround time",
  "system call", "virtual machine", "real-time system", "program counter", "mutual exclusion",
  "indirect communication", "direct communication", "non-blocking receive", "blocking receive",
  "non-blocking send", "blocking send", "bounded waiting", "circular wait", "hold and wait",
  "no preemption", "busy waiting", "many-to-many", "many-to-one", "one-to-one",
  "two-level", "message passing", "shared memory", "ready", "waiting",
  "running", "new", "terminated", "dispatcher", "scheduler", "semaphore", "starvation",
  "non-preemptive", "preemptive", "turnaround", "throughput", "fairness", "quantum",
  "buffering", "caching", "spooling", "deadlock", "prevention", "avoidance", "recovery",
  "detection", "loader", "shell", "barrier", "monitor", "reader", "writer", "buffer",
  "producer", "consumer", "counter", "signal", "wait", "block", "wakeup", "mailbox",
  "aging", "overlay", "swapping", "banker", "bursts", "burst", "Max", "Need", "Allocation",
  "Request", "Available", "Work", "Stack", "Progress", "Enter", "Exit", "bind", "listen",
  "fork", "admit", "dispatch", "Mutex", "ASMP", "SMP", "SRTF", "FCFS", "SJF", "RR",
  "MLFQ", "CPU", "PCB", "DMA", "IPC", "I/O", "PC",
].sort((a, b) => b.length - a.length);

const escapeRegex = text => text.replace(/[.*+?^$\u007b\u007d()|[\]\\]/g, "\\$&");
const termPattern = new RegExp(
  "(?<![\\p{L}\\p{N}])(?:" + terms.map(escapeRegex).join("|") + "|\\\\[a-zA-Z]+(?:\\{[a-zA-Z]*\\})?)(?![\\p{L}\\p{N}])",
  "giu",
);
const pronounce = {
  cpu: "C P U", pcb: "P C B", dma: "D M A", ipc: "I P C", "i/o": "I O", pc: "P C",
  fcfs: "F C F S", sjf: "S J F", srtf: "S R T F", rr: "R R", smp: "S M P", asmp: "A S M P",
  mlfq: "M L F Q",
};

export function splitSpeech(text) {
  const pieces = [];
  let start = 0;
  const add = (lang, value) => {
    const clean = value.replace(/[“”‘’]/g, "").trim();
    if (clean && /[\p{L}\p{N}&]/u.test(clean)) {
      pieces.push({ lang, text: clean === "&" ? "ký hiệu và" : clean });
    }
  };
  for (const match of text.matchAll(termPattern)) {
    add("vi", text.slice(start, match.index));
    const phrase = match[0];
    add("en", pronounce[phrase.toLowerCase()] || phrase.replace(/^\\/, "").replace(/[{}]/g, " "));
    start = match.index + phrase.length;
  }
  add("vi", text.slice(start));
  return pieces;
}

export function questionSpeech(question, options, readOptions) {
  const plan = splitSpeech(question);
  if (readOptions) {
    for (const option of options) {
      plan.push({ lang: "vi", text: labelSounds[option.letter] + "." }, ...splitSpeech(option.text));
    }
  }
  return plan;
}

export function answerSpeech(correctOptions) {
  if (!correctOptions.length) return [{ lang: "vi", text: "Tài liệu chưa xác định đáp án đúng." }];
  const plan = [{ lang: "vi", text: "Đáp án đúng là" }];
  for (const option of correctOptions) {
    plan.push({ lang: "vi", text: labelSounds[option.letter] + "." }, ...splitSpeech(option.text));
  }
  return plan;
}

export function voiceFor(voices, lang, selected) {
  const matches = voices.filter(voice => voice.lang.toLowerCase().split(/[-_]/)[0] === lang);
  return matches.find(voice => voice.voiceURI === selected)
    || matches.find(voice => /google/i.test(voice.name))
    || matches.find(voice => voice.default)
    || matches[0];
}

export function createSpeaker(synth, Utterance, getSettings, onStatus, onError) {
  let generation = 0;
  let current = null;
  let playing = false;
  const supported = Boolean(synth && Utterance);
  const stop = () => {
    generation++;
    current = null;
    if (supported) synth.cancel();
    playing = false;
    onStatus(false);
  };
  function start(plan) {
    if (!supported || !plan.length) return;
    stop();
    const session = generation;
    const prefs = getSettings();
    const voices = synth.getVoices();
    playing = true;
    onStatus(true);
    const next = index => {
      if (session !== generation) return;
      if (!plan[index]) {
        current = null;
        playing = false;
        onStatus(false);
        return;
      }
      const piece = plan[index];
      current = new Utterance(piece.text);
      current.lang = piece.lang === "vi" ? "vi-VN" : "en-US";
      const voice = voiceFor(voices, piece.lang, prefs[piece.lang]);
      if (voice) current.voice = voice;
      current.rate = prefs.rate;
      current.volume = prefs.volume;
      current.onend = () => next(index + 1);
      current.onerror = event => {
        if (session !== generation) return;
        stop();
        onError(event.error);
      };
      synth.speak(current);
    };
    next(0);
  }
  return { supported, stop, start, get playing() { return playing; } };
}

