import nlp from "compromise";

export const parseInput = (input) => {
  if (!input || typeof input !== "string") return "";

  let clean = input.trim();

  clean = clean
    .replace(/\^/g, "**")
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s*\(/g, "sqrt(")
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    .replace(/\\pi/g, "pi")
    .replace(/∞/g, "Infinity")
    .replace(/\{([^}]+)\}/g, "($1)")
    .replace(/\\pm/g, "±") // LaTeX \pm → ±
    .replace(/\s+/g, " ");

  return clean;
};

export const validateMathExpression = (expression) => {
  const errors = [];
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

  // Ruxsat etilgan belgilar
  const validChars = /^[0-9a-zA-Z+\-*/^().=,π∞ ]+$/;
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
