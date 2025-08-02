import express from "express";
import { solveMathProblem } from "../controllers/mathController.js";

const router = express.Router();

router.post("/solve", solveMathProblem);

export default router;
