import nlp from "compromise";

// Convert LaTeX and spoken math to computable expression (mathjs/nerdamer)
export const parseInput = (input) => {
  if (!input || typeof input !== "string") return "";
  let cleaned = input.trim();

  // Normalize common LaTeX wrappers
  cleaned = cleaned
    .replace(/\\left\s*\(/g, "(")
    .replace(/\\right\s*\)/g, ")")
    .replace(/\\cdot|\\times/g, "*")
    .replace(/\\,|\\!/g, " ")
    .replace(/\\pi/g, "pi")
    .replace(/\\infty/g, "Infinity")
    .replace(/\\mathrm\{([^}]*)\}/g, "$1");

  // Fractions & roots
  cleaned = cleaned
    .replace(/\\frac\{([^}]*)\}\{([^}]*)\}/g, "($1)/($2)")
    .replace(/\\sqrt\{([^}]*)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s*\(([^)]*)\)/g, "sqrt($1)");

  // Trig/log names
  cleaned = cleaned
    .replace(/\\sin/g, "sin")
    .replace(/\\cos/g, "cos")
    .replace(/\\tan/g, "tan")
    .replace(/\\ln/g, "ln")
    .replace(/\\log/g, "log");

  // Binomial & sums (simple heuristic)
  cleaned = cleaned.replace(
    /\\binom\{([^}]*)\}\{([^}]*)\}/g,
    "binomial($1,$2)"
  );
  cleaned = cleaned.replace(
    /\\sum_\{([^}]*)=([^}]*)\}\^\{([^}]*)\}\s*/g,
    (m, idx, from, to) => {
      // Next token after sum is the summand; we try to capture following (...) or {...} or a token
      // For stability, require user to pass already expanded or use series().
      return `SUM(${idx},${from},${to},`;
    }
  );
  // Close a possible SUM(..., summand) if user wrote e.g. "\\sum_{k=0}^{n} k^2"
  cleaned = cleaned.replace(
    /SUM\(([^,]+),([^,]+),([^,]+),\s*([^].]+)\)/g,
    (m, idx, from, to, body) => `sum(${body}, ${idx}, ${from}, ${to})`
  );

  // Integrals: \int_a^b f(x) dx or \int f(x) dx
  cleaned = cleaned.replace(
    /\\int_\{([^}]*)\}\^\{([^}]*)\}([^d]+)d([a-zA-Z])/g,
    (m, a, b, fx, v) => `integrate(${fx.trim()}, ${v}, ${a}, ${b})`
  );
  cleaned = cleaned.replace(
    /\\int\s+([^d]+)d([a-zA-Z])/g,
    (m, fx, v) => `integrate(${fx.trim()}, ${v})`
  );

  // Limits: \lim_{h->0} g(h)
  cleaned = cleaned.replace(
    /\\lim_\{\s*([a-zA-Z])\s*\\to\s*([^}]*)\s*\}\s*([^\n]+)/g,
    (m, v, to, body) => `limit(${body.trim()}, ${v}, ${to})`
  );

  // Matrices: \begin{bmatrix} ... \\ ... \end{bmatrix}
  cleaned = cleaned.replace(
    /\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g,
    (_, body) => {
      const rows = body
        .trim()
        .split(/\\\\/)
        .map((r) => r.trim())
        .filter(Boolean);
      const arr = rows
        .map(
          (r) =>
            `[${r
              .split(/&/)
              .map((c) => c.trim())
              .join(",")}]`
        )
        .join(",");
      return `[[${arr}]]`;
    }
  );

  // Vector arrows / norms
  cleaned = cleaned.replace(/\\vec\{([^}]*)\}/g, "$1");
  cleaned = cleaned.replace(
    /\\\|([^|]+)\\\|/g,
    (m, inside) => `norm(${inside})`
  );

  // Spoken words -> symbols (via compromise)
  const doc = nlp(cleaned.toLowerCase());
  const numberTerms = doc.numbers().out("array");
  const numberValues = doc.numbers().toNumber().out("array");
  numberTerms.forEach((term, i) => {
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(escaped, "gi");
    cleaned = cleaned.replace(rx, numberValues[i]);
  });

  cleaned = cleaned
    .replace(/\bplus\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .replace(/−/g, "-")
    .replace(/\btimes\b/gi, "*")
    .replace(/\bmultiplied by\b/gi, "*")
    .replace(/\bdivided by\b/gi, "/")
    .replace(/\bover\b/gi, "/")
    .replace(/\bequals\b/gi, "=")
    .replace(/\bis equal to\b/gi, "=");
};
