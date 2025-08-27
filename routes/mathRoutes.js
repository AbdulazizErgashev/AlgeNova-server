import express from "express";
import { solveMathProblem } from "../services/mathEngine";


const router = express.Router();

router.post("/solve", solveMathProblem);

export default router;
