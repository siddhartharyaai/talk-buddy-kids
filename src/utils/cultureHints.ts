// Step H: Indian-English phrase hints for culturally aware responses
export const cultureHints = {
  en: {
    // Indian English terms
    food: {
      lunch: "tiffin",
      snack: "tiffin",
      dinner: "khana",
      breakfast: "nashta",
      water: "paani"
    },
    family: {
      grandmother: "dadi/nani",
      grandfather: "dada/nana", 
      aunt: "aunty/maasi/bua",
      uncle: "uncle/mama/tau",
      sister: "didi",
      brother: "bhai"
    },
    school: {
      teacher: "teacher ji",
      homework: "homework/studies",
      exam: "paper/exam"
    },
    common: {
      yes: "haan",
      no: "nahin",
      okay: "theek hai",
      good: "accha",
      very_good: "bahut accha"
    }
  },
  hi: {
    // Hindi equivalents for common concepts
    greetings: {
      hello: "नमस्ते",
      goodbye: "अलविदा", 
      good_morning: "सुप्रभात",
      good_night: "शुभ रात्रि"
    },
    animals: {
      elephant: "हाथी",
      tiger: "बाघ",
      lion: "शेर",
      monkey: "बंदर",
      bird: "पक्षी"
    },
    colors: {
      red: "लाल",
      blue: "नीला", 
      green: "हरा",
      yellow: "पीला",
      white: "सफेद"
    }
  }
};

export const getCultureHintsText = (language: 'english' | 'hindi'): string => {
  if (language === 'hindi') {
    return `Cultural context: Use Hindi words when appropriate. Common terms: ${Object.entries(cultureHints.hi.greetings).map(([k,v]) => `${k}=${v}`).join(', ')}. Animals: ${Object.entries(cultureHints.hi.animals).map(([k,v]) => `${k}=${v}`).join(', ')}.`;
  }
  
  return `Cultural context: Use Indian-English terms when appropriate. Food: ${Object.entries(cultureHints.en.food).map(([k,v]) => `${k}=${v}`).join(', ')}. Family: ${Object.entries(cultureHints.en.family).map(([k,v]) => `${k}=${v}`).join(', ')}.`;
};