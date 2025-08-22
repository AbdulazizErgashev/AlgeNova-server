import nlp from "compromise";

export const parseInput = (input) => {
  if (!input || typeof input !== "string") return "";

  let cleaned = input.trim();

  // 1️⃣ Son so‘zlarini raqamga aylantirish
  const doc = nlp(cleaned.toLowerCase());
  const numberTerms = doc.numbers().out("array");
  const numberValues = doc.numbers().toNumber().out("array");

  numberTerms.forEach((term, i) => {
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedTerm, "gi");
    cleaned = cleaned.replace(regex, numberValues[i]);
  });

  // 2️⃣ Matnni matematik belgiga aylantirish
  cleaned = cleaned
    .replace(/\bplus\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .replace(/\btimes\b/gi, "*")
    .replace(/\bmultiplied by\b/gi, "*")
    .replace(/\bdivided by\b/gi, "/")
    .replace(/\bover\b/gi, "/")
    .replace(/\bequals\b/gi, "=")
    .replace(/\bis equal to\b/gi, "=")
    .replace(/\bsquared\b/gi, "^2")
    .replace(/\bcubed\b/gi, "^3")
    .replace(/\bto the power of\b/gi, "^")
    .replace(/\bsquare root of\b/gi, "sqrt(")
    .replace(/\bsine\b/gi, "sin")
    .replace(/\bcosine\b/gi, "cos")
    .replace(/\btangent\b/gi, "tan")
    .replace(/\bnatural log\b/gi, "ln")
    .replace(/\blogarithm\b/gi, "log")
    .replace(/\bderivative of\b/gi, "d/dx(")
    .replace(/\bd\/dx\b/gi, "d/dx")
    .replace(/\s+/g, " ")
    .trim();

  // 3️⃣ Pattern rules
  const patterns = [
    {
      regex: /subtract\s+([^from]+)\s+from\s+(.+)/gi,
      replacement: (match, p1, p2) => `${p2.trim()} - ${p1.trim()}`,
    },
    {
      regex: /(\d+(?:\.\d+)?)\s*percent\s+of\s+(.+)/gi,
      replacement: (match, p1, p2) => `${p1}/100*${p2.trim()}`,
    },
    {
      regex: /solve\s+for\s+\w+:?\s*/gi,
      replacement: "",
    },
  ];
  patterns.forEach((p) => (cleaned = cleaned.replace(p.regex, p.replacement)));

  // 4️⃣ Funksiya argumentlarini qavsga olish
  const functions = ["sin", "cos", "tan", "log", "ln", "sqrt", "abs"];
  functions.forEach((func) => {
    const regex = new RegExp(`${func}\\s*\\(([^)]*)\\)`, "gi");
    cleaned = cleaned.replace(regex, `${func}($1)`);
  });

  // 5️⃣ Implicit multiplication (faqat son+harf va qavslar uchun)
  cleaned = cleaned.replace(/(\d)([a-zA-Z])/g, "$1*$2"); // 2x -> 2*x
  cleaned = cleaned.replace(/([a-zA-Z])(\d)/g, "$1*$2"); // x2 -> x*2
  cleaned = cleaned.replace(/\)(\d)/g, ")*$1"); // )( -> )*n
  cleaned = cleaned.replace(/(\d)\(/g, "$1*("); // 2( -> 2*(

  // 6️⃣ Operatorlar atrofidagi bo‘sh joyni olib tashlash
  cleaned = cleaned.replace(/\s*([\+\-\*\/\^=])\s*/g, "$1");

  return cleaned;
};

export const validateMathExpression = (expression) => {
  const errors = [];

  // qavslarni tekshirish
  let parenCount = 0;
  for (const char of expression) {
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (parenCount < 0) {
      errors.push("Unmatched closing parenthesis");
      break;
    }
  }
  if (parenCount > 0) errors.push("Unmatched opening parenthesis");

  // noto‘g‘ri belgilar
  const validChars = /^[0-9a-zA-Z+\-*/^()=.,]+$/;
  if (!validChars.test(expression)) {
    errors.push("Contains invalid characters");
  }

  // ketma-ket operatorlar
  if (/[+\-*/^]{2,}/.test(expression)) {
    errors.push("Consecutive operators found");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
