type Listener = (title: string, text: string) => void;
let listener: Listener | null = null;
let holds = 0;
const waiting: [string, string][] = [];

function flush() {
  if (!listener || holds > 0) return;
  while (waiting.length) {
    const [title, text] = waiting.shift()!;
    listener(title, text);
  }
}

export function showToast(title: string, text: string) {
  waiting.push([title, text]);
  flush();
}

export function onToast(fn: Listener) {
  listener = fn;
  flush();
  return () => {
    listener = null;
  };
}

/** Sheets draw above everything on iOS, so banners wait until the sheet has closed. */
export function holdToasts() {
  holds++;
  return () => {
    holds--;
    flush();
  };
}
