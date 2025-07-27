export type Mode = 'chat'|'story'|'game'|'coaching'|'repair'|'bedtime'|'break';

export interface TurnSignals {
  sttConfidence: number;
  interrupted: boolean;
  silenceMs: number;
  avgTurnSecs: number;
  sentiment: 'pos'|'neu'|'neg';
  energy: 'low'|'med'|'high';
}

export interface Decision {
  mode: Mode;
  tokMax: number;
  needClarify: boolean;
  prosody: 'calm'|'excited'|'soothing'|'singing'|'neutral';
}

export function decideNext(
  age: number,
  engaged: boolean,
  lastMode: Mode,
  s: TurnSignals
): Decision {
  const tokMax = age <= 5 ? (engaged ? 90 : 50)
               : age <= 8 ? (engaged ? 140 : 90)
                         : (engaged ? 220 : 150);

  let mode: Mode = lastMode;
  if (s.silenceMs > 6000)                 mode = 'game';
  if (s.sentiment === 'neg')              mode = 'coaching';
  if (s.energy === 'low' && age <= 6)     mode = 'story';
  if (s.interrupted && lastMode === 'story') mode = 'chat';
  if (s.sttConfidence < 0.75)              mode = 'repair';

  const prosody =
      mode === 'story'    ? 'excited' :
      mode === 'coaching' ? 'soothing':
      mode === 'game'     ? 'excited' :
                          'neutral';

  return { mode, tokMax, needClarify: s.sttConfidence < 0.75, prosody };
}