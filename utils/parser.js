import nlp from "compromise";

export const parseInput = (input) => {
  if (!input || typeof input !== "string") return "";

  let clean = input.trim();

  clean = clean
    // Powers: x^{2} → x**2
    .replace(/([a-zA-Z0-9])\^\{([^}]+)\}/g, "$1**$2")
    .replace(/\^/g, "**")
    // Fractions
    .replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)")
    // Roots
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s*\(/g, "sqrt(")
    // Trigonometry & log
    .replace(/\\(sin|cos|tan|log|ln)\s*\(/g, "$1(")
    // Multiplication & division
    .replace(/÷/g, "/")
    .replace(/×/g, "*")
    // Constants
    .replace(/\\pi/g, "pi")
    .replace(/∞/g, "Infinity")
    // Remove empty braces
    .replace(/\{\}/g, "")
    // General braces {a+b} → (a+b)
    .replace(/\{([^}]+)\}/g, "($1)")
    // Plus/minus
    .replace(/\\pm/g, "±")
    // Implicit multiplication: 2x → 2*x
    .replace(/(\d)([a-zA-Z])/g, "$1*$2")
    .replace(/(\d)\(/g, "$1*(")
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

  // Allowed characters
  const validChars = /^[0-9a-zA-Z+\-*/^().=,π∞± ]+$/;
  if (!validChars.test(expression)) {
    errors.push("Contains invalid characters");
  }

  // Check consecutive operators (ignore leading - for negatives)
  if (/([+\/*^]{2,})/.test(expression)) {
    errors.push("Consecutive operators found");
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
};
