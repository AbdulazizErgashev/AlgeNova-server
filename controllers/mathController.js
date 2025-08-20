// controllers/mathController.js
import { create, all, parse, simplify } from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Solve.js";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Extra.js";

import { parseInput } from "../utils/parser.js";

const math = create(all);

/**
 * Main Controller: Solve Math Problem
 */
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
      formula: formula,
    });
  }
};

/**
 * Step-by-step solver
 */
const generateStepByStepSolution = async (formula) => {
  const originalFormula = formula;

  // normalize input (sqrt*, ^, va boshqalarni tuzatamiz)
  const parsed = parseInput(formula)
    .replace(/sqrt\*/g, "sqrt") // noto‘g‘ri sqrt* ni tuzatish
    .replace(/√\(/g, "sqrt("); // √ belgisi bo‘lsa, sqrt() ga aylantirish

  let solution = {
    originalFormula,
    parsedFormula: parsed,
    steps: [],
    finalAnswer: null,
    verification: null,
    explanation: "",
    type: determineFormulaType(parsed),
  };

  if (solution.type === "equation") {
    solution = await solveEquation(parsed, solution);
  } else if (solution.type === "expression") {
    solution = await evaluateExpression(parsed, solution);
  } else if (solution.type === "derivative") {
    solution = await solveDerivative(parsed, solution);
  } else if (solution.type === "integral") {
    solution = await solveIntegral(parsed, solution);
  } else {
    throw new Error("Unsupported formula type.");
  }

  return solution;
};

/**
 * Detect formula type
 */
const determineFormulaType = (formula) => {
  if (
    formula.includes("=") &&
    !formula.includes("∫") &&
    !formula.includes("d/dx")
  ) {
    return "equation";
  } else if (formula.includes("d/dx") || formula.includes("'")) {
    return "derivative";
  } else if (
    formula.includes("∫") ||
    formula.toLowerCase().includes("integral")
  ) {
    return "integral";
  } else {
    return "expression";
  }
};

/**
 * Solve equations
 */
const solveEquation = async (formula, solution) => {
  solution.explanation =
    "This is an algebraic or transcendental equation. I will solve for the unknown variable by isolating it on one side.";

  try {
    const [leftSide, rightSide] = formula.split("=").map((s) => s.trim());

    solution.steps.push({
      step: 1,
      description: "Original equation",
      expression: `${leftSide} = ${rightSide}`,
      explanation: "Starting with the given equation.",
    });

    // nerdamer bilan yechish
    const nerdSolution = nerdamer(
      `solve(${leftSide}-(${rightSide}), x)`
    ).toString();

    const answers = nerdSolution
      .replace(/^\[|\]$/g, "")
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    solution.finalAnswer = answers.map((a) => `x = ${a}`);

    solution.steps.push({
      step: 2,
      description: "Solved equation",
      expression: solution.finalAnswer.join(" or "),
      explanation: "Isolated the variable using algebraic rules.",
    });

    // verify
    solution.verification = verifyEquationSolution(
      leftSide,
      rightSide,
      answers
    );
  } catch (error) {
    solution.steps.push({
      step: 1,
      description: "Error",
      expression: formula,
      explanation: `Unable to process equation: ${error.message}`,
    });
    solution.finalAnswer = "Error in processing";
  }

  return solution;
};

/**
 * Expression evaluation
 */
const evaluateExpression = async (formula, solution) => {
  solution.explanation =
    "This is a mathematical expression. I will evaluate it step by step.";

  try {
    solution.steps.push({
      step: 1,
      description: "Original expression",
      expression: formula,
      explanation: "Starting with the given mathematical expression.",
    });

    const expr = parse(formula);
    const simplified = simplify(expr);

    if (simplified.toString() !== formula) {
      solution.steps.push({
        step: 2,
        description: "Simplified form",
        expression: simplified.toString(),
        explanation: "Simplifying the expression using algebraic rules.",
      });
    }

    const result = math.evaluate(formula);
    solution.finalAnswer = result;

    solution.steps.push({
      step: solution.steps.length + 1,
      description: "Final calculation",
      expression: `= ${result}`,
      explanation:
        "Performing the final calculation to get the numerical result.",
    });
  } catch (error) {
    throw new Error(error.message);
  }

  return solution;
};

/**
 * Derivative solver
 */
const solveDerivative = async (formula, solution) => {
  solution.explanation =
    "This is a derivative problem. I will find the derivative using differentiation rules.";

  try {
    let func = formula
      .replace(/d\/dx\s*/, "")
      .trim()
      .replace(/'/g, "");
    solution.steps.push({
      step: 1,
      description: "Original function",
      expression: `f(x) = ${func}`,
      explanation: "Identifying the function to differentiate.",
    });

    const deriv = nerdamer(`diff(${func}, x)`).toString();

    solution.steps.push({
      step: 2,
      description: "Apply differentiation rules",
      expression: `f'(x) = ${deriv}`,
      explanation: "Using calculus differentiation rules.",
    });

    solution.finalAnswer = deriv;
  } catch (error) {
    throw new Error(error.message);
  }

  return solution;
};

/**
 * Integral solver
 */
const solveIntegral = async (formula, solution) => {
  solution.explanation =
    "This is an integration problem. I will find the antiderivative.";

  try {
    let func = formula
      .replace(/∫/, "")
      .replace(/integral/i, "")
      .trim();
    const integral = nerdamer(`integrate(${func}, x)`).toString();

    solution.steps.push({
      step: 1,
      description: "Integration",
      expression: `∫ ${func} dx = ${integral} + C`,
      explanation: "Finding the antiderivative symbolically.",
    });

    solution.finalAnswer = `${integral} + C`;
  } catch (error) {
    solution.finalAnswer = "Integration failed";
  }

  return solution;
};

/**
 * Verification for equation solutions
 */
const verifyEquationSolution = (leftSide, rightSide, solutions) => {
  const verifications = [];

  if (!Array.isArray(solutions)) solutions = [solutions];

  solutions.forEach((sol) => {
    try {
      // faqat raqamni ajratib olish (x= qismidan keyin)
      const cleanSol = sol.replace(/^x\s*=\s*/, "");

      const leftResult = math.evaluate(leftSide.replace(/x/g, `(${cleanSol})`));
      const rightResult = math.evaluate(
        rightSide.replace(/x/g, `(${cleanSol})`)
      );

      verifications.push({
        solution: `x = ${cleanSol}`,
        leftSide: `${leftSide} → ${leftResult}`,
        rightSide: `${rightSide} → ${rightResult}`,
        isCorrect: Math.abs(leftResult - rightResult) < 1e-10,
      });
    } catch (error) {
      verifications.push({
        solution: `x = ${sol}`,
        error: `Verification error: ${error.message}`,
      });
    }
  });

  return verifications;
};

/**
 * Helper endpoint: GET /api/math/help
 */
export const getMathHelp = async (req, res) => {
  const helpInfo = {
    supportedOperations: [
      "Linear, quadratic, polynomial equations",
      "Equations with sqrt, log, sin, cos, tan",
      "Expression evaluation (simplify + calculate)",
      "Derivatives (d/dx)",
      "Integrals (basic antiderivative)",
    ],
    examples: [
      { type: "Linear Equation", input: "2x + 5 = 13" },
      { type: "Quadratic Equation", input: "x^2 - 4 = 0" },
      { type: "Square Root Equation", input: "sqrt(x+4) = 6" },
      { type: "Logarithmic Equation", input: "log(x) = 2" },
      { type: "Trigonometric Equation", input: "sin(x) = 0.5" },
      { type: "Derivative", input: "d/dx(x^2 + 3x)" },
      { type: "Integral", input: "∫x^2" },
    ],
  };

  res.json(helpInfo);
};
