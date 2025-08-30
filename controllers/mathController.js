import { create, all, parse, simplify } from "mathjs";
import nerdamer from "nerdamer";
import "nerdamer/Solve.js";
import "nerdamer/Algebra.js";
import "nerdamer/Calculus.js";
import "nerdamer/Extra.js";
import { parseInput } from "../utils/parser.js";

const math = create(all);

// Helper: mathjs -> LaTeX
const toLatex = (expr) => {
  try {
    return math.parse(expr).toTex({ parenthesis: "keep", implicit: "show" });
  } catch {
    return expr; // Agar parse bo'lmasa oddiy string qaytariladi
  }
};

const cleanOutput = (str) => str.replace(/\*/g, "").replace(/\s+/g, " ").trim();

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

const generateStepByStepSolution = async (formula) => {
  const originalFormula = formula;

  // 🔹 LaTeX {} → () ga o‘tkazib yuboramiz
  let parsed = parseInput(formula)
    .replace(/√\(/g, "sqrt(")
    .replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)")
    .replace(/\\sqrt\s*\(/g, "sqrt(")
    .replace(/\{([^}]+)\}/g, "($1)");

  // 🔹 Avval maxsus formulalarni tekshiramiz
  const special = handleSpecialFormulas(formula);
  if (special) {
    return {
      originalFormula,
      parsedFormula: parsed,
      steps: [],
      finalAnswer: "Special Formula",
      finalAnswerLatex: special,
      verification: null,
      explanation: "This is a well-known mathematical identity/theorem.",
      type: "special",
    };
  }

  // 🔹 Oddiy holatlarda avvalgidek ishlayveradi
  let solution = {
    originalFormula,
    parsedFormula: parsed,
    steps: [],
    finalAnswer: null,
    finalAnswerLatex: null,
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

// ---------------- Equation Solver ----------------
const solveEquation = async (formula, solution) => {
  solution.explanation =
    "This is an algebraic or transcendental equation. I will solve for the unknown variable by isolating it on one side.";
  try {
    // Agar tenglamada ± bo‘lsa → ikkita variantga bo‘lib yuboramiz
    if (formula.includes("±")) {
      const plusVersion = formula.replace("±", "+");
      const minusVersion = formula.replace("±", "-");

      const plusSolution = await solveEquation(plusVersion, {
        ...solution,
        steps: [],
      });
      const minusSolution = await solveEquation(minusVersion, {
        ...solution,
        steps: [],
      });

      solution.finalAnswer = [
        ...plusSolution.finalAnswer,
        ...minusSolution.finalAnswer,
      ];
      solution.finalAnswerLatex = [
        ...plusSolution.finalAnswerLatex,
        ...minusSolution.finalAnswerLatex,
      ];

      solution.steps.push({
        step: 1,
        description: "Handling ±",
        expression: `${plusVersion}  OR  ${minusVersion}`,
        expressionLatex: `${toLatex(plusVersion)} \\; \\text{or} \\; ${toLatex(
          minusVersion
        )}`,
        explanation: "Splitting ± into + and - to get two separate solutions.",
      });

      return solution;
    }

    const [leftSide, rightSide] = formula.split("=").map((s) => s.trim());

    solution.steps.push({
      step: 1,
      description: "Original equation",
      expression: `${leftSide} = ${rightSide}`,
      expressionLatex: `${toLatex(leftSide)} = ${toLatex(rightSide)}`,
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
      const naturalExp = Math.exp(val);
      answers.push(`${base10}`);
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
    solution.finalAnswerLatex = answers.map((a) => `x = ${toLatex(a)}`);

    solution.steps.push({
      step: 2,
      description: "Solved equation",
      expression: solution.finalAnswer.join(" or "),
      expressionLatex: solution.finalAnswerLatex.join(" \\text{ or } "),
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
      expressionLatex: formula,
      explanation: `Unable to process equation: ${error.message}`,
    });
    solution.finalAnswer = "Error in processing";
    solution.finalAnswerLatex = "Error in processing";
  }
  return solution;
};

// ---------------- Expression Solver ----------------
const evaluateExpression = async (formula, solution) => {
  solution.explanation =
    "This is a mathematical expression. I will evaluate it step by step.";
  try {
    solution.steps.push({
      step: 1,
      description: "Original expression",
      expression: formula,
      expressionLatex: toLatex(formula),
      explanation: "Starting with the given mathematical expression.",
    });

    const expr = parse(formula);
    const simplified = simplify(expr);

    if (simplified.toString() !== formula) {
      solution.steps.push({
        step: 2,
        description: "Simplified form",
        expression: cleanOutput(simplified.toString()),
        expressionLatex: toLatex(simplified.toString()),
        explanation: "Simplifying the expression using algebraic rules.",
      });
    }

    const result = math.evaluate(formula);
    solution.finalAnswer = cleanOutput(result.toString());
    solution.finalAnswerLatex = toLatex(result.toString());

    solution.steps.push({
      step: solution.steps.length + 1,
      description: "Final calculation",
      expression: `= ${solution.finalAnswer}`,
      expressionLatex: `= ${solution.finalAnswerLatex}`,
      explanation:
        "Performing the final calculation to get the numerical result.",
    });
  } catch (error) {
    throw new Error(error.message);
  }
  return solution;
};

// ---------------- Derivative Solver ----------------
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
      expressionLatex: `f(x) = ${toLatex(func)}`,
      explanation: "Identifying the function to differentiate.",
    });

    const deriv = nerdamer(`diff(${func}, x)`).toString();
    const cleanedDeriv = cleanOutput(deriv);

    solution.steps.push({
      step: 2,
      description: "Apply differentiation rules",
      expression: `f'(x) = ${cleanedDeriv}`,
      expressionLatex: `f'(x) = ${toLatex(cleanedDeriv)}`,
      explanation: "Using calculus differentiation rules.",
    });

    solution.finalAnswer = cleanedDeriv;
    solution.finalAnswerLatex = toLatex(cleanedDeriv);
  } catch (error) {
    throw new Error(error.message);
  }
  return solution;
};

// ---------------- Integral Solver (yangilangan) ----------------
const solveIntegral = async (formula, solution) => {
  solution.explanation =
    "This is an integration problem. I will find the antiderivative.";
  try {
    let func = formula
      .replace(/∫/, "")
      .replace(/integral/i, "")
      .replace(/dx$/i, "")
      .trim();

    solution.steps.push({
      step: 1,
      description: "Setup",
      expression: `∫ ${func} dx`,
      expressionLatex: `\\int ${toLatex(func)} \\, dx`,
      explanation: "Starting with the given integral.",
    });

    // Special case: polynomial * sin/cos(x) => integration by parts
    const match = func.match(/^(.+?)\s*\*\s*(sin|cos)\(x\)$/i);
    if (match) {
      let poly = match[1];
      let trig = match[2].toLowerCase();

      solution.steps.push({
        step: 2,
        description: "Integration by parts",
        expression: `u = ${poly}, dv = ${trig}(x) dx`,
        expressionLatex: `u=${toLatex(poly)}, dv=${trig}(x) dx`,
        explanation: "Choose u as the polynomial and dv as trig function.",
      });

      const du = nerdamer(`diff(${poly}, x)`).toString();
      const v = trig === "cos" ? "sin(x)" : "-cos(x)";

      solution.steps.push({
        step: 3,
        description: "Differentiate and integrate",
        expression: `du = ${du}, v = ${v}`,
        expressionLatex: `du=${toLatex(du)}, v=${toLatex(v)}`,
        explanation: "Differentiate u and integrate dv.",
      });

      solution.steps.push({
        step: 4,
        description: "Apply formula",
        expression: `∫ ${poly}*${trig}(x) dx = ${poly}*${v} - ∫ ${v}*(${du}) dx`,
        expressionLatex: `\\int ${toLatex(poly)} ${trig}(x) dx = ${toLatex(
          poly
        )}${toLatex(v)} - \\int ${toLatex(v)}${toLatex(du)} dx`,
        explanation: "Applying integration by parts formula.",
      });
    }

    const integral = nerdamer(`integrate(${func}, x)`).toString();
    const cleanedIntegral = cleanOutput(integral);

    solution.steps.push({
      step: solution.steps.length + 1,
      description: "Final result",
      expression: `${cleanedIntegral} + C`,
      expressionLatex: `${toLatex(cleanedIntegral)} + C`,
      explanation: "Simplified final antiderivative.",
    });

    solution.finalAnswer = `${cleanedIntegral} + C`;
    solution.finalAnswerLatex = `${toLatex(cleanedIntegral)} + C`;
  } catch (error) {
    solution.finalAnswer = "Integration failed";
    solution.finalAnswerLatex = "Integration failed";
  }
  return solution;
};

// ---------------- Verification ----------------
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
              solutionLatex: `x = ${toLatex(cleanSol)}, k=${kVal}`,
              leftSide: `${leftSide} → ${leftResult}`,
              rightSide: `${rightSide} → ${rightResult}`,
              isCorrect: Math.abs(leftResult - rightResult) < 1e-10,
            });
          } catch (err) {
            verifications.push({
              solution: `x = ${cleanSol}, k=${kVal}`,
              solutionLatex: `x = ${toLatex(cleanSol)}, k=${kVal}`,
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
          solutionLatex: `x = ${toLatex(cleanSol)}`,
          leftSide: `${leftSide} → ${leftResult}`,
          rightSide: `${rightSide} → ${rightResult}`,
          isCorrect: Math.abs(leftResult - rightResult) < 1e-10,
        });
      }
    } catch (error) {
      verifications.push({
        solution: `x = ${sol}`,
        solutionLatex: `x = ${toLatex(sol)}`,
        error: `Verification error: ${error.message}`,
      });
    }
  });

  return verifications;
};

// ---------------- Help Endpoint ----------------
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

// ---------------- Special Formula Handler ----------------
const handleSpecialFormulas = (formula) => {
  const specialFormulas = {
    quadratic: "x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}",
    binomial: "(a+b)^n = \\sum_{k=0}^{n} \\binom{n}{k} a^{n-k} b^k",
    euler: "e^{i\\pi} + 1 = 0",
    pythagoras: "\\sin^2(\\theta) + \\cos^2(\\theta) = 1",
    derivative_def: "f'(x) = \\lim_{h \\to 0} \\frac{f(x+h) - f(x)}{h}",
    integral_general: "\\int_a^b f(x) dx = F(b) - F(a)",
    maclaurin: "e^x = \\sum_{n=0}^{\\infty} \\frac{x^n}{n!}",
    matrix:
      "A = \\begin{bmatrix} 1 & 2 & 3 \\\\ 4 & 5 & 6 \\\\ 7 & 8 & 9 \\end{bmatrix}",
    vector_length: "\\|\\vec{v}\\| = \\sqrt{v_1^2 + v_2^2 + \\cdots + v_n^2}",
    gauss_integral: "\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}",
  };

  if (/quadratic/i.test(formula)) return specialFormulas.quadratic;
  if (/binomial/i.test(formula)) return specialFormulas.binomial;
  if (/euler/i.test(formula)) return specialFormulas.euler;
  if (/pythagoras|trig/i.test(formula)) return specialFormulas.pythagoras;
  if (/derivative.+definition/i.test(formula))
    return specialFormulas.derivative_def;
  if (/integral.+general/i.test(formula))
    return specialFormulas.integral_general;
  if (/maclaurin/i.test(formula)) return specialFormulas.maclaurin;
  if (/matrix/i.test(formula)) return specialFormulas.matrix;
  if (/vector.+length/i.test(formula)) return specialFormulas.vector_length;
  if (/gauss.+integral/i.test(formula)) return specialFormulas.gauss_integral;

  return null;
};
