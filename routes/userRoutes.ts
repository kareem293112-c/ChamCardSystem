
import express from 'express';
import { verifyNationalId, getActiveSessions, changePin, submitTicket } from '../controllers/userController';

const router = express.Router();

router.post("/verify-national-id", verifyNationalId);
router.get("/active-sessions/:userId", getActiveSessions);
router.post("/change-pin", changePin);
router.post("/submit-ticket", submitTicket);

export default router;
