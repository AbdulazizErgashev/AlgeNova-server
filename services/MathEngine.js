// =========================
// File: src/services/mathEngine.js
// =========================
import {
  create,
  all,
  parse as mathParse,
  simplify as mathSimplify,
} from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Solve.js";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Extra.js";
import { parseInput, validateMathExpression } from "../utils/parser.js";

// MathJS instance (fraction: false for compact output; configure as needed)
const math = create(all, { matrix: "Matrix", number: "number" });

// -------------------- Utilities --------------------
const isMatrixString = (s) => /\[\[.*\]\]/.test(s);

const toLatex = (expr) => {
  try {
    // Accept both strings and MathJS nodes
    if (typeof expr === "string") {
      const node = math.parse(expr);
      return node.toTex({ parenthesis: "keep", implicit: "show" });
    }
    if (expr && typeof expr.toTex === "function") return expr.toTex();
    return String(expr);
  } catch {
    return String(expr);
  }
};

const cleanOutput = (str) =>
  String(str).replace(/\*/g, "").replace(/\s+/g, " ").trim();

const detectMainVariable = (formula) => {
  // Find candidate variables excluding known function names and constants
  const banned = new Set([
    "sin",
    "cos",
    "tan",
    "cot",
    "sec",
    "csc",
    "asin",
    "acos",
    "atan",
    "atan2",
    "log",
    "ln",
    "sqrt",
    "abs",
    "det",
    "inv",
    "transpose",
    "trace",
    "norm",
    "sum",
    "integrate",
    "diff",
    "series",
    "binomial",
    "exp",
    "mod",
    "re",
    "im",
    "arg",
    "conj",
    "pi",
    "e",
    "Infinity",
    "NaN",
    "i",
  ]);
  const vars = new Set(
    (formula.match(/[a-zA-Z]+/g) || []).filter((v) => !banned.has(v))
  );
  if (vars.size === 0) return "x";
  if (vars.has("x")) return "x";
  return Array.from(vars)[0];
};

// Nerdamer wrapper: integrate/limit/series helpers
const integrateNerdamer = (f, v, a = undefined, b = undefined) => {
  if (a !== undefined && b !== undefined) {
    return nerdamer(`defint(${f}, ${v}, ${a}, ${b})`).toString();
  }
  return nerdamer(`integrate(${f}, ${v})`).toString();
};

const limitNerdamer = (f, v, to) =>
  nerdamer(`limit(${f}, ${v}, ${to})`).toString();
const seriesNerdamer = (f, v, around = 0, order = 5) =>
  nerdamer(`series(${f}, ${v}, ${around}, ${order})`).toString();

// -------------------- Main HTTP handlers --------------------
export const solveMathProblem = async (req, res) => {
  const { formula } = req.body || {};
  if (!formula || typeof formula !== "string") {
    return res.status(400).json({
      error:
        "No formula provided. Please provide a mathematical expression to solve.",
      example: { formula: "2x + 5 = 13" },
    });
  }
  try {
    const solution = await generateStepByStepSolution(formula);
    res.json(solution);
  } catch (err) {
    res.status(400).json({
      error: "Invalid or unsupported formula.",
      details: err.message,
      formula,
    });
  }
};
