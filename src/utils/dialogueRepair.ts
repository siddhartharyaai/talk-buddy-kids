export const maybeRepair = (stt: string, prevUser: string[]): string => {
  const last = prevUser.at(-1) ?? '';
  const isOneWord = stt.trim().split(/\s+/).length === 1;
  const looksLikeCorrection =
        Math.abs(stt.length - last.length) < 8 &&
        isOneWord &&
        last.toLowerCase().includes(stt.toLowerCase());
  return looksLikeCorrection ? last.replace(stt, stt) : stt;
};