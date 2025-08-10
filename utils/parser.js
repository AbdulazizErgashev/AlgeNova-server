import nlp from "compromise";

export const parseInput = (input) => {
  let cleaned = input.trim().toLowerCase();

  cleaned = cleaned
    .replace(/plus/g, "+")
    .replace(/add/g, "+")
    .replace(/sum/g, "+")
    .replace(/minus/g, "-")
    .replace(/subtract/g, "-")
    .replace(/difference of/g, "-")
    .replace(/times/g, "*")
    .replace(/multiplied by/g, "*")
    .replace(/product of/g, "*")
    .replace(/over/g, "/")
    .replace(/divided by/g, "/")
    .replace(/divide/g, "/")
    .replace(/quotient of/g, "/")
    .replace(/equals/g, "=")
    .replace(/is/g, "=")
    .replace(/\b(and|of|the)\b/g, "");

  const fromMatch = cleaned.match(/subtract (\d+) from (\d+)/);
  if (fromMatch) {
    return `${fromMatch[2]} - ${fromMatch[1]}`;
  }

  const sumMatch = cleaned.match(/sum (\d+) (\d+)/);
  if (sumMatch) {
    return `${sumMatch[1]} + ${sumMatch[2]}`;
  }

  const productMatch = cleaned.match(/product (\d+) (\d+)/);
  if (productMatch) {
    return `${productMatch[1]} * ${productMatch[2]}`;
  }

  const quotientMatch = cleaned.match(/quotient (\d+) (\d+)/);
  if (quotientMatch) {
    return `${quotientMatch[1]} / ${quotientMatch[2]}`;
  }

  const doc = nlp(cleaned);
  const numbers = doc.numbers().toNumber().out("array");

  const operators = ["+", "-", "*", "/", "="];
  const operator = operators.find((op) => cleaned.includes(op));

  if (numbers.length === 2 && operator) {
    return `${numbers[0]} ${operator} ${numbers[1]}`;
  }

  // Faqat ruxsat etilgan belgilar qoldiriladi
  return cleaned.replace(/[^0-9+\-*/(). ]/g, "");
};
