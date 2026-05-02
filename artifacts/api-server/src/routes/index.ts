import { Router, type IRouter } from "express";
import healthRouter from "./health";
import tasksRouter from "./tasks";
import habitsRouter from "./habits";
import eventsRouter from "./events";
import prayersRouter from "./prayers";
import focusRouter from "./focus";
import dailySummaryRouter from "./daily-summary";
import islamicRouter from "./islamic";
import settingsRouter from "./settings";
import gamificationRouter from "./gamification";
import reportsRouter from "./reports";

const router: IRouter = Router();

router.use(healthRouter);
router.use(tasksRouter);
router.use(habitsRouter);
router.use(eventsRouter);
router.use(prayersRouter);
router.use(focusRouter);
router.use(dailySummaryRouter);
router.use(islamicRouter);
router.use(settingsRouter);
router.use(gamificationRouter);
router.use(reportsRouter);

export default router;
