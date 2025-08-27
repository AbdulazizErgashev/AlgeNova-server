import { create, all } from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Solve.js";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Extra.js";
import { parseInput } from "../utils/parser.js";

// MathJS instance
const math = create(all, { matrix: "Matrix", number: "number" });

// -------------------- Utilities --------------------
const toLatex = (expr) => {
  try {
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

const detectMainVariable = (formula) => {
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

// Nerdamer wrappers
const integrateNerdamer = (f, v, a, b) => {
  if (a !== undefined && b !== undefined) {
    return nerdamer(`defint(${f}, ${v}, ${a}, ${b})`).toString();
  }
  return nerdamer(`integrate(${f}, ${v})`).toString();
};

const limitNerdamer = (f, v, to) =>
  nerdamer(`limit(${f}, ${v}, ${to})`).toString();

const seriesNerdamer = (f, v, around = 0, order = 5) =>
  nerdamer(`series(${f}, ${v}, ${around}, ${order})`).toString();

// -------------------- Step-by-step solver --------------------
const generateStepByStepSolution = async (formula) => {
  const parsed = parseInput(formula);
  const variable = detectMainVariable(parsed);

  let result;
  try {
    // 1. Algebraic simplification
    const simplified = math.simplify(parsed);

    // 2. Equation solving if "=" exists
    if (parsed.includes("=")) {
      const [lhs, rhs] = parsed.split("=");
      const eq = nerdamer(`${lhs}-(${rhs})`);
      result = eq.solveFor(variable).toString();
    } else {
      result = simplified.toString();
    }

    return {
      originalFormula: formula,
      parsedFormula: parsed,
      variable,
      solution: result,
      latex: toLatex(parsed),
    };
  } catch (err) {
    throw new Error(`Parsing/Solving failed: ${err.message}`);
  }
};

// -------------------- HTTP Handler --------------------
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
