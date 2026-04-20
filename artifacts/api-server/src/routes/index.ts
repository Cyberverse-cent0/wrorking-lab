import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import usersRouter from "./users";
import projectsRouter from "./projects";
import membersRouter from "./members";
import invitationsRouter from "./invitations";
import tasksRouter from "./tasks";
import milestonesRouter from "./milestones";
import filesRouter from "./files";
import messagesRouter from "./messages";
import activityRouter from "./activity";
import analyticsRouter from "./analytics";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(usersRouter);
router.use(projectsRouter);
router.use(membersRouter);
router.use(invitationsRouter);
router.use(tasksRouter);
router.use(milestonesRouter);
router.use(filesRouter);
router.use(messagesRouter);
router.use(activityRouter);
router.use(analyticsRouter);
router.use(adminRouter);

export default router;
