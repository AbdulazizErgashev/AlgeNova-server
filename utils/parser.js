import nlp from "compromise";

export const parseInput = (input) => {
  if (!input || typeof input !== "string") return "";

  let cleaned = input.trim();

  // 1️⃣ Avval son so‘zlarini raqamga aylantirish
  const doc = nlp(cleaned.toLowerCase());
  const numberTerms = doc.numbers().out("array"); // ["twelve", "three hundred"]
  const numberValues = doc.numbers().toNumber().out("array"); // [12, 300]

  numberTerms.forEach((term, i) => {
    // Escape special regex characters
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(escapedTerm, "gi"); // \b olib tashlandi
    cleaned = cleaned.replace(regex, numberValues[i]);
  });

  // 2️⃣ Matematik notation va symbolarni qayta ishlash
  cleaned = cleaned
    // Basic operations
    .replace(/\bplus\b/gi, "+")
    .replace(/\badd\b/gi, "+")
    .replace(/\bsum\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .replace(/\bsubtract\b/gi, "-")
    .replace(/\btimes\b/gi, "*")
    .replace(/\bmultiplied by\b/gi, "*")
    .replace(/\bproduct of\b/gi, "*")
    .replace(/\bdivided by\b/gi, "/")
    .replace(/\bover\b/gi, "/")
    .replace(/\bequals\b/gi, "=")
    .replace(/\bis equal to\b/gi, "=")

    // Powers and roots
    .replace(/\bsquared\b/gi, "^2")
    .replace(/\bcubed\b/gi, "^3")
    .replace(/\bto the power of\b/gi, "^")
    .replace(/\bsquare root of\b/gi, "sqrt(")
    .replace(/\bsqrt\s*\(/gi, "sqrt(") // 'sqrt (' ni 'sqrt(' ga almashtirish

    // Trigonometric functions
    .replace(/\bsine\b/gi, "sin")
    .replace(/\bcosine\b/gi, "cos")
    .replace(/\btangent\b/gi, "tan")

    // Logarithms
    .replace(/\blogarihtm\b/gi, "log")
    .replace(/\bnatural log\b/gi, "ln")
    .replace(/\bln\b/gi, "ln")

    // Derivatives
    .replace(/\bderivative of\b/gi, "d/dx(")
    .replace(/\bd\/dx\b/gi, "d/dx")

    // Remove extra spaces
    .replace(/\s+/g, " ")
    .trim();

  // 3️⃣ Maxsus patternlar
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

  patterns.forEach((pattern) => {
    cleaned = cleaned.replace(pattern.regex, pattern.replacement);
  });

  // 4️⃣ Funksiya argumentlariga qavs qo‘shish
  const functions = ["sin", "cos", "tan", "log", "ln", "sqrt", "abs"];
  functions.forEach((func) => {
    const regex = new RegExp(`${func}\\s+([^\\s\\(]+)`, "gi");
    cleaned = cleaned.replace(regex, `${func}($1)`);
  });

  // 5️⃣ Implicit multiplication
  cleaned = cleaned.replace(/(\d)([a-zA-Z])/g, "$1*$2");
  cleaned = cleaned.replace(/([a-zA-Z])(\d)/g, "$1*$2");
  cleaned = cleaned.replace(/\)(\d|[a-zA-Z])/g, ")*$1");
  cleaned = cleaned.replace(/(\d|[a-zA-Z])\(/g, "$1*(");

  // 6️⃣ Remove spaces around operators (mathjs / nerdamer friendly)
  cleaned = cleaned.replace(/\s*([\+\-\*\/\^=])\s*/g, "$1");

  return cleaned;
};

export const validateMathExpression = (expression) => {
  const errors = [];

  // Check for balanced parentheses
  let parenCount = 0;
  for (const char of expression) {
    if (char === "(") parenCount++;
    if (char === ")") parenCount--;
    if (parenCount < 0) {
      errors.push("Unmatched closing parenthesis");
      break;
    }
  }
  if (parenCount > 0) {
    errors.push("Unmatched opening parenthesis");
  }

  // Check for invalid characters
  const validChars = /^[0-9a-zA-Z+\-*/^()=.,]+$/;
  if (!validChars.test(expression)) {
    errors.push("Contains invalid characters");
  }

  // Check for consecutive operators
  if (/[+\-*/^]{2,}/.test(expression)) {
    errors.push("Consecutive operators found");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
};
