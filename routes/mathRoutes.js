import express from "express";
import {
  solveMathProblem,
  getMathHelp,
} from "../controllers/mathController.js";

const router = express.Router();

router.post("/solve", solveMathProblem);
router.get("/help", getMathHelp);

export default router;
