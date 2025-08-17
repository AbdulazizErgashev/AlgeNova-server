import { evaluate, parse, simplify, derivative } from "mathjs";
import { parseInput } from "../utils/parser.js";

/**
 * Controller: Solve Math Problem
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
  const parsed = parseInput(formula); // normalize input

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
  } else if (formula.includes("∫") || formula.includes("integral")) {
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
    "This is an algebraic equation. I will solve for the unknown variable by isolating it on one side.";

  try {
    const [leftSide, rightSide] = formula.split("=").map((side) => side.trim());

    solution.steps.push({
      step: 1,
      description: "Original equation",
      expression: `${leftSide} = ${rightSide}`,
      explanation: "Starting with the given equation.",
    });

    const expr = parse(formula.replace("=", "-(") + ")");
    const simplified = simplify(expr);

    solution.steps.push({
      step: 2,
      description: "Rearrange equation",
      expression: `${simplified.toString()} = 0`,
      explanation:
        "Moving all terms to one side to set the equation equal to zero.",
    });

    if (isLinearEquation(leftSide, rightSide)) {
      const linearSolution = solveLinearEquation(
        leftSide,
        rightSide,
        solution.steps.length
      );
      solution.steps.push(...linearSolution.steps);
      solution.finalAnswer = linearSolution.answer;
    } else {
      try {
        const result = evaluate(`solve(${formula}, x)`);
        solution.finalAnswer = Array.isArray(result) ? result : [result];

        solution.steps.push({
          step: solution.steps.length + 1,
          description: "Solution",
          expression: `x = ${solution.finalAnswer.join(" or x = ")}`,
          explanation: "Using algebraic methods to find the solution(s).",
        });
      } catch (e) {
        solution.finalAnswer = "Unable to solve automatically";
      }
    }

    if (
      solution.finalAnswer &&
      solution.finalAnswer !== "Unable to solve automatically"
    ) {
      solution.verification = verifyEquationSolution(
        leftSide,
        rightSide,
        solution.finalAnswer
      );
    }
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
 * Linear equation helper
 */
const solveLinearEquation = (leftSide, rightSide, startStep) => {
  const steps = [];
  let currentStep = startStep + 1;

  const leftMatch = leftSide.match(/(-?\d*)\s*\*?\s*x\s*([+-]\s*\d+)?/);
  const rightValue = evaluate(rightSide);

  if (leftMatch) {
    const coefficient =
      leftMatch[1] === ""
        ? 1
        : leftMatch[1] === "-"
        ? -1
        : Number.parseFloat(leftMatch[1]);
    const constant = leftMatch[2] ? evaluate(leftMatch[2]) : 0;

    if (constant !== 0) {
      steps.push({
        step: currentStep++,
        description: "Subtract constant from both sides",
        expression: `${coefficient}x = ${rightValue} - (${constant})`,
        explanation: `Subtracting ${constant} from both sides to isolate the x term.`,
      });

      steps.push({
        step: currentStep++,
        description: "Simplify right side",
        expression: `${coefficient}x = ${rightValue - constant}`,
        explanation: "Performing the arithmetic on the right side.",
      });
    }

    const answer = (rightValue - constant) / coefficient;

    steps.push({
      step: currentStep++,
      description: "Divide both sides by coefficient",
      expression: `x = ${rightValue - constant} / ${coefficient}`,
      explanation: `Dividing both sides by ${coefficient} to solve for x.`,
    });

    steps.push({
      step: currentStep++,
      description: "Final answer",
      expression: `x = ${answer}`,
      explanation: "This is our solution.",
    });

    return { steps, answer: [answer] };
  }

  return { steps: [], answer: "Unable to solve" };
};

/**
 * Linear equation check
 */
const isLinearEquation = (leftSide, rightSide) => {
  const combined = leftSide + rightSide;
  return (
    !combined.includes("x^") &&
    !combined.includes("x*x") &&
    !combined.includes("sin") &&
    !combined.includes("cos") &&
    !combined.includes("tan") &&
    !combined.includes("log")
  );
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

    const result = evaluate(formula);
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
    let func = formula.replace(/d\/dx\s*\$\$?/, "").replace(/\$\$?$/, "");
    func = func.replace(/'/g, "");

    solution.steps.push({
      step: 1,
      description: "Original function",
      expression: `f(x) = ${func}`,
      explanation: "Identifying the function to differentiate.",
    });

    const expr = parse(func);
    const deriv = derivative(expr, "x");

    solution.steps.push({
      step: 2,
      description: "Apply differentiation rules",
      expression: `f'(x) = ${deriv.toString()}`,
      explanation: "Using calculus differentiation rules.",
    });

    solution.finalAnswer = deriv.toString();
  } catch (error) {
    throw new Error(error.message);
  }

  return solution;
};

/**
 * Integral solver (placeholder)
 */
const solveIntegral = async (formula, solution) => {
  solution.explanation =
    "This is an integration problem. I will find the antiderivative.";

  solution.steps.push({
    step: 1,
    description: "Integration problem",
    expression: formula,
    explanation:
      "Finding the antiderivative requires advanced symbolic computation.",
  });

  solution.finalAnswer = "Integration requires advanced symbolic computation";
  return solution;
};

/**
 * Equation solution verification
 */
const verifyEquationSolution = (leftSide, rightSide, solutions) => {
  const verifications = [];

  if (!Array.isArray(solutions)) {
    solutions = [solutions];
  }

  solutions.forEach((sol) => {
    try {
      const leftResult = evaluate(leftSide.replace(/x/g, `(${sol})`));
      const rightResult = evaluate(rightSide.replace(/x/g, `(${sol})`));

      verifications.push({
        solution: `x = ${sol}`,
        leftSide: `${leftSide.replace(/x/g, `(${sol})`)} = ${leftResult}`,
        rightSide: `${rightSide.replace(/x/g, `(${sol})`)} = ${rightResult}`,
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
      "Linear equations (e.g., 2x + 5 = 13)",
      "Quadratic equations (e.g., x^2 - 4x + 3 = 0)",
      "Polynomial expressions (e.g., x^3 + 2x^2 - x + 1)",
      "Basic derivatives (e.g., d/dx(x^2 + 3x))",
      "Trigonometric functions (e.g., sin(x) + cos(x))",
      "Logarithmic expressions (e.g., log(x) + ln(x))",
    ],
    examples: [
      { type: "Linear Equation", input: "2x + 5 = 13" },
      { type: "Expression Evaluation", input: "3^2 + 4*5 - 2" },
      { type: "Derivative", input: "d/dx(x^2 + 3x + 1)" },
    ],
    usage: {
      endpoint: "/api/math/solve",
      method: "POST",
      body: { formula: "your_mathematical_expression_here" },
    },
  };

  res.json(helpInfo);
};
