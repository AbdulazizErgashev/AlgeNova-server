import { create, all, parse, simplify } from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Solve.js";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Extra.js";
import { parseInput } from "../utils/parser.js";

const math = create(all);

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

const cleanOutput = (str) => {
  return str.replace(/\*/g, "").replace(/\s+/g, " ").trim();
};

const generateStepByStepSolution = async (formula) => {
  const originalFormula = formula;
  const parsed = parseInput(formula).replace(/√\(/g, "sqrt(");
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
    let answers = [];

    if (leftSide.startsWith("sin(")) {
      const val = math.evaluate(rightSide);
      answers.push(`x = asin(${val}) + 2kπ`);
      answers.push(`x = π - asin(${val}) + 2kπ`);
    } else if (leftSide.startsWith("cos(")) {
      const val = math.evaluate(rightSide);
      answers.push(`x = acos(${val}) + 2kπ`);
      answers.push(`x = -acos(${val}) + 2kπ`);
    } else if (leftSide.startsWith("tan(")) {
      const val = math.evaluate(rightSide);
      answers.push(`x = atan(${val}) + kπ`);
    } else if (leftSide.startsWith("log(")) {
      const val = math.evaluate(rightSide);
      const base10 = Math.pow(10, val);
      answers.push(`${base10}`);
      const naturalExp = Math.exp(val);
      answers.push(`e^${val}`);
      answers.push(`${naturalExp}`);
    } else {
      const nerdSolution = nerdamer(
        `solve(${leftSide}-(${rightSide}), x)`
      ).toString();
      answers = nerdSolution
        .replace(/^\[|\]$/g, "")
        .split(",")
        .map((s) => cleanOutput(s))
        .filter((s) => s.length > 0);
    }

    solution.finalAnswer = answers.map((a) => `x = ${a}`);
    solution.steps.push({
      step: 2,
      description: "Solved equation",
      expression: solution.finalAnswer.join(" or "),
      explanation:
        "Isolated the variable using algebraic, logarithmic, or trigonometric rules.",
    });
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
        expression: cleanOutput(simplified.toString()),
        explanation: "Simplifying the expression using algebraic rules.",
      });
    }
    const result = math.evaluate(formula);
    solution.finalAnswer = cleanOutput(result.toString());
    solution.steps.push({
      step: solution.steps.length + 1,
      description: "Final calculation",
      expression: `= ${solution.finalAnswer}`,
      explanation:
        "Performing the final calculation to get the numerical result.",
    });
  } catch (error) {
    throw new Error(error.message);
  }
  return solution;
};

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
    const cleanedDeriv = cleanOutput(deriv);
    solution.steps.push({
      step: 2,
      description: "Apply differentiation rules",
      expression: `f'(x) = ${cleanedDeriv}`,
      explanation: "Using calculus differentiation rules.",
    });
    solution.finalAnswer = cleanedDeriv;
  } catch (error) {
    throw new Error(error.message);
  }
  return solution;
};

const solveIntegral = async (formula, solution) => {
  solution.explanation =
    "This is an integration problem. I will find the antiderivative.";
  try {
    let func = formula
      .replace(/∫/, "")
      .replace(/integral/i, "")
      .trim();
    const integral = nerdamer(`integrate(${func}, x)`).toString();
    const cleanedIntegral = cleanOutput(integral);
    solution.steps.push({
      step: 1,
      description: "Integration",
      expression: `∫ ${func} dx = ${cleanedIntegral} + C`,
      explanation: "Finding the antiderivative symbolically.",
    });
    solution.finalAnswer = `${cleanedIntegral} + C`;
  } catch (error) {
    solution.finalAnswer = "Integration failed";
  }
  return solution;
};

const verifyEquationSolution = (leftSide, rightSide, solutions) => {
  const verifications = [];
  if (!Array.isArray(solutions)) solutions = [solutions];
  solutions.forEach((sol) => {
    try {
      let cleanSol = sol.replace(/^x\s*=\s*/, "").trim();
      cleanSol = cleanSol.replace(/π/g, "pi");
      if (/k/.test(cleanSol)) {
        [0, 1].forEach((kVal) => {
          const testExpr = cleanSol.replace(/k/g, `(${kVal})`);
          try {
            const leftResult = math.evaluate(
              leftSide.replace(/x/g, `(${testExpr})`)
            );
            const rightResult = math.evaluate(
              rightSide.replace(/x/g, `(${testExpr})`)
            );
            verifications.push({
              solution: `x = ${cleanSol}, k=${kVal}`,
              leftSide: `${leftSide} → ${leftResult}`,
              rightSide: `${rightSide} → ${rightResult}`,
              isCorrect: Math.abs(leftResult - rightResult) < 1e-10,
            });
          } catch (err) {
            verifications.push({
              solution: `x = ${cleanSol}, k=${kVal}`,
              error: `Verification error: ${err.message}`,
            });
          }
        });
      } else {
        const leftResult = math.evaluate(
          leftSide.replace(/x/g, `(${cleanSol})`)
        );
        const rightResult = math.evaluate(
          rightSide.replace(/x/g, `(${cleanSol})`)
        );
        verifications.push({
          solution: `x = ${cleanSol}`,
          leftSide: `${leftSide} → ${leftResult}`,
          rightSide: `${rightSide} → ${rightResult}`,
          isCorrect: Math.abs(leftResult - rightResult) < 1e-10,
        });
      }
    } catch (error) {
      verifications.push({
        solution: `x = ${sol}`,
        error: `Verification error: ${error.message}`,
      });
    }
  });
  return verifications;
};

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
