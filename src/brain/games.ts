export async function quickMath(age: number) {
  const a = Math.ceil(Math.random() * 10), b = Math.ceil(Math.random() * 10);
  return { prompt: `What is ${a}+${b}?`, answer: `${a+b}` };
}

export async function rhymeComplete(age: number) {
  const words = ['cat', 'dog', 'sun', 'fun', 'ball', 'tall'];
  const word = words[Math.floor(Math.random() * words.length)];
  return { prompt: `Tell me a word that rhymes with ${word}!`, answer: 'any rhyming word' };
}

export async function breathing5s(age: number) {
  return { 
    prompt: `Let's take 5 deep breaths together! Breathe in... and out...`, 
    answer: 'breathing exercise' 
  };
}

export const games = ['quickMath', 'rhymeComplete', 'breathing5s'];