type Listener = (title: string, text: string) => void;
let listener: Listener | null = null;
const waiting: [string, string][] = [];

export function showToast(title: string, text: string) {
  if (listener) listener(title, text);
  else waiting.push([title, text]);
}

export function onToast(fn: Listener) {
  listener = fn;
  while (waiting.length) {
    const [title, text] = waiting.shift()!;
    fn(title, text);
  }
  return () => {
    listener = null;
  };
}
