import nlp from "compromise";

export const parseInput = (input) => {
  if (!input || typeof input !== "string") return "";

  let clean = input.trim();

  clean = clean
    // LaTeX power: x^{2} → x**2
    .replace(/([a-zA-Z0-9])\^\{([^}]+)\}/g, "$1**$2")
    // Standalone caret: x^2 → x**2
    .replace(/\^/g, "**")
    // Multiplication & division signs
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    // Square root
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s*\(/g, "sqrt(")
    // Fractions
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    // Constants
    .replace(/\\pi/g, "pi")
    .replace(/∞/g, "Infinity")
    // Remove empty braces: x{} → x
    .replace(/\{\}/g, "")
    // General braces {a+b} → (a+b)
    .replace(/\{([^}]+)\}/g, "($1)")
    // Plus/minus
    .replace(/\\pm/g, "±")
    // Normalize spaces
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
