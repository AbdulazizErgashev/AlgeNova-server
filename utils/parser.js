import nlp from "compromise";

export const parseInput = (input) => {
  if (!input || typeof input !== "string") return "";

  // Boshlang'ich tozalash
  let cleaned = input.trim().toLowerCase();

  // Matematik so'zlarni belgilar bilan almashtirish
  cleaned = cleaned
    .replace(/\bplus\b/g, "+")
    .replace(/\badd\b/g, "+")
    .replace(/\bsum\b/g, "+")
    .replace(/\bminus\b/g, "-")
    .replace(/\bsubtract\b/g, "-")
    .replace(/\bdifference of\b/g, "-")
    .replace(/\btimes\b/g, "*")
    .replace(/\bmultiplied by\b/g, "*")
    .replace(/\bproduct of\b/g, "*")
    .replace(/\bover\b/g, "/")
    .replace(/\bdivided by\b/g, "/")
    .replace(/\bdivide\b/g, "/")
    .replace(/\bquotient of\b/g, "/")
    .replace(/\bequals\b/g, "=")
    .replace(/\bis\b/g, "=")
    .replace(/\b(and|the)\b/g, ""); // 'of' ni o'chirmaymiz, chunki 'product of' kerak bo'lishi mumkin

  // maxsus formatlar
  const fromMatch = cleaned.match(/subtract (\d+) from (\d+)/);
  if (fromMatch) return `${fromMatch[2]} - ${fromMatch[1]}`;

  const sumMatch = cleaned.match(/sum (\d+) (\d+)/);
  if (sumMatch) return `${sumMatch[1]} + ${sumMatch[2]}`;

  const productMatch = cleaned.match(/product (\d+) (\d+)/);
  if (productMatch) return `${productMatch[1]} * ${productMatch[2]}`;

  const quotientMatch = cleaned.match(/quotient (\d+) (\d+)/);
  if (quotientMatch) return `${quotientMatch[1]} / ${quotientMatch[2]}`;

  // NLP orqali sonlarni olish
  const doc = nlp(cleaned);
  const numbers = doc.numbers().toNumber().out("array");

  // Operatorlarni aniqlash
  const operators = ["+", "-", "*", "/", "="];
  let detectedOperator = null;
  for (let op of operators) {
    if (cleaned.includes(` ${op} `) || cleaned.startsWith(op) || cleaned.endsWith(op)) {
      detectedOperator = op;
      break;
    }
  }

  // Agar ikki son va operator aniq bo'lsa
  if (numbers.length === 2 && detectedOperator) {
    return `${numbers[0]} ${detectedOperator} ${numbers[1]}`;
  }

  // Faqat ruxsat etilgan belgilar qoldiriladi
  return cleaned.replace(/[^0-9+\-*/(). ]/g, "");
};
