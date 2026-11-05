import type { PieceType } from './bots';
import type { Label } from './classify';

export interface Teacher {
  id: string;
  name: string;
  piece: PieceType;
  color: string;
  lip: string;
  style: string;
  // Each teacher reacts in their own voice. A random line is picked from the list.
  say: Record<Label, string[]>;
  correct: string[];
  wrong: string[];
  hello: string[];
}

export const TEACHERS: Teacher[] = [
  {
    id: 'poppy', name: 'Poppy', piece: 'p', color: '#58B92E', lip: '#3F921B', style: 'Cheers for everything you do',
    hello: ['Ready when you are!', 'I saved you a good one today.', 'Back again? I love that.'],
    correct: ['Yes! You saw it!', 'That is the one!', 'Look at you go!'],
    wrong: ['So close! Have another look.', 'No stress, that one is tricky.', 'Good try. What is undefended?'],
    say: {
      brilliant: ['WOW. You gave up a piece and it WORKS!', 'Brilliant! I am telling everyone about this!'],
      great: ['The only move that works, and you found it!', 'Great find! That took real vision.'],
      best: ['Exactly what I would have played!', 'Top move!'],
      excellent: ['Lovely. Nearly perfect.', 'Really nice move.'],
      good: ['Solid. Keep it going!', 'That works just fine.'],
      book: ['A proper opening move. So fancy!', 'Straight out of the opening book!'],
      inaccuracy: ['Not bad, but there was a bit more here.', 'Close, with a slightly better option.'],
      mistake: ['Oof, a slip. You can still fight!', 'Let us learn from that one.'],
      miss: ['They slipped and you missed it. It happens!', 'There was a free chance right there!'],
      blunder: ['Eek! Deep breath, we learn from these.', 'Ouch. Everyone does this, even the pros.'],
    },
  },
  {
    id: 'bishop', name: 'Professor Hale', piece: 'b', color: '#3F7FE0', lip: '#2A5FB5', style: 'Calm, precise, explains why',
    hello: ['Shall we begin?', 'Today, we think before we touch.', 'A short study session, then.'],
    correct: ['Precisely.', 'Correct. Note how forcing that was.', 'Well reasoned.'],
    wrong: ['Not quite. Start with checks and captures.', 'Consider what your opponent threatens.', 'Look again at the undefended pieces.'],
    say: {
      brilliant: ['A sound sacrifice. Truly brilliant.', 'Remarkable. The material returns with interest.'],
      great: ['The only strong continuation. Well found.', 'Everything else falls short. Great move.'],
      best: ['The engine agrees with you.', 'Objectively the best move.'],
      excellent: ['Very accurate.', 'An excellent choice.'],
      good: ['Reasonable, and it keeps the balance.', 'Sound enough.'],
      book: ['Established opening theory.', 'A well-known move in this opening.'],
      inaccuracy: ['Slightly imprecise.', 'Playable, though it gives away a small edge.'],
      mistake: ['This gives away real value.', 'A mistake. Note what changed on the board.'],
      miss: ['Your opponent erred and you did not punish it.', 'A winning chance went by here.'],
      blunder: ['A serious error. Review it afterwards.', 'That changes the evaluation sharply.'],
    },
  },
  {
    id: 'rook', name: 'Coach Brick', piece: 'r', color: '#E5533D', lip: '#BD3A26', style: 'Tough love, keeps you honest',
    hello: ['No excuses today. Let us go.', 'Warm up. Puzzles first.', 'Back on the board. Good.'],
    correct: ['That is what I want to see.', 'Good. Now do it again.', 'Yes. Next.'],
    wrong: ['No. Slow down and look.', 'You rushed that. Again.', 'Check every capture first.'],
    say: {
      brilliant: ['Now THAT is chess. Brilliant.', 'Huge sacrifice. Huge. I am impressed.'],
      great: ['Only move, and you found it. Good.', 'That is how you stay in the fight.'],
      best: ['Correct. Keep that focus.', 'Best move. Stay sharp.'],
      excellent: ['Strong. No complaints.', 'Good discipline.'],
      good: ['Fine. There may be better.', 'Acceptable.'],
      book: ['You know your opening. Good.', 'Standard move. Carry on.'],
      inaccuracy: ['Sloppy. You had better.', 'Tighten that up.'],
      mistake: ['That costs you. Focus.', 'Mistake. Do not let it happen twice.'],
      miss: ['They handed you a chance and you dropped it.', 'Punish mistakes. You did not.'],
      blunder: ['Blunder. Check what you hang before you move.', 'Ouch. Shake it off and fight back.'],
    },
  },
  {
    id: 'queen', name: 'Madame Vale', piece: 'q', color: '#A667F0', lip: '#8247CC', style: 'Elegant, witty, a little dramatic',
    hello: ['Darling, you came back.', 'Let us make something beautiful.', 'The board has missed you.'],
    correct: ['Delightful.', 'Oh, very stylish.', 'Now that had some flair.'],
    wrong: ['Hmm, not quite the look we want.', 'Try something more daring.', 'Darling, no. Look again.'],
    say: {
      brilliant: ['Magnifique! A sacrifice with style!', 'I may faint. Brilliant.'],
      great: ['The one move that saves the show.', 'Great! A perfect little moment.'],
      best: ['Flawless, darling.', 'Exactly right.'],
      excellent: ['Very elegant.', 'That is rather lovely.'],
      good: ['Pleasant enough.', 'Tasteful.'],
      book: ['A classic. Always in fashion.', 'From the great old opening books.'],
      inaccuracy: ['A small wobble in the heels.', 'Nearly, but not quite chic.'],
      mistake: ['Oh dear. How unfortunate.', 'That one will not make the highlights.'],
      miss: ['They tripped, and you simply walked by!', 'A gift, darling, and you left it there.'],
      blunder: ['A catastrophe! But a memorable one.', 'Let us never speak of that move again.'],
    },
  },
];

export function getTeacher(id: string | undefined): Teacher {
  return TEACHERS.find((t) => t.id === id) ?? TEACHERS[0];
}

export function pickLine(lines: string[]): string {
  return lines[Math.floor(Math.random() * lines.length)];
}
