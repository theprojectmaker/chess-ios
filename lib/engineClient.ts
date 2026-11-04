import { Engine, type ThinkOptions, type ThinkResult } from './engine';

const engine = new Engine();
let chain: Promise<unknown> = Promise.resolve();

/** One search at a time on the shared engine: a newer request stops whatever is running. */
export function think(fen: string, previousFens: string[], options: ThinkOptions): Promise<ThinkResult> {
  engine.cancel();
  const run = chain.then(() => {
    engine.setPosition(fen, previousFens);
    return engine.think(options);
  });
  chain = run.catch(() => {});
  return run;
}

export function cancelThinking() {
  engine.cancel();
}
