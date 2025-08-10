import { evaluate } from "mathjs";
import { parseInput } from "../utils/parser.js";

export const solveMathProblem = async (req, res) => {
  const { question } = req.body || {};

  if (!question) {
    return res
      .status(400)
      .json({ error: "No problem provided.", body: req.body });
  }

  try {
    const parsed = parseInput(question);
    const result = evaluate(parsed);
    res.json({ input: question, parsed, result });
  } catch (err) {
    res
      .status(500)
      .json({ error: "Could not solve the problem.", details: err.message });
  }
};
