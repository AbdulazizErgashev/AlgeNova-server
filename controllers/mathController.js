import { evaluate } from "mathjs";
import { parseInput } from "../utils/parser.js";

export const solveMathProblem = async (req, res) => {
  const { problem } = req.body;

  if (!problem) {
    return res.status(400).json({ error: "No problem provided" });
  }

  try {
    const parsed = parseInput(problem);
    const result = evaluate(parsed);
    res.json({ input: problem, parsed, result });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Could not solve the problem", details: error.message });
  }
};
