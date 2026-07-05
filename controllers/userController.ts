
import { Request, Response } from 'express';
import { db } from '../server';
import crypto from 'crypto';

export const verifyNationalId = async (req: Request, res: Response) => {
  try {
    const { nationalId, userId } = req.body;
    const userRef = db.collection('users').doc(userId);
    await userRef.update({
      is_national_verified: true,
      user_role: "verified_citizen",
      nationalId
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error verifying national ID:", err);
    res.status(500).json({ message: "فشل توثيق الهوية" });
  }
};

export const getActiveSessions = async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const logsSnap = await db.collection('login_logs').where('userId', '==', userId).get();
    const sessions = logsSnap.docs.map(d => d.data());
    res.json(sessions);
  } catch (err: any) {
    console.error("Error fetching sessions:", err);
    res.status(500).json({ message: "فشل جلب الجلسات" });
  }
};

export const changePin = async (req: Request, res: Response) => {
  try {
    const { userId, newPin } = req.body;
    const userRef = db.collection('users').doc(userId);
    const hashedPin = crypto.createHash('sha256').update(newPin).digest('hex');
    await userRef.update({ pin: hashedPin });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error changing PIN:", err);
    res.status(500).json({ message: "فشل تغيير رمز المرور" });
  }
};

export const submitTicket = async (req: Request, res: Response) => {
  try {
    const { userId, type, message } = req.body;
    const ticketId = "ticket_" + Math.random().toString(36).substr(2, 9);
    await db.collection('support_tickets').doc(ticketId).set({
      id: ticketId,
      userId,
      type,
      message,
      timestamp: Date.now(),
      status: 'pending'
    });
    res.json({ success: true });
  } catch (err: any) {
    console.error("Error submitting ticket:", err);
    res.status(500).json({ message: "فشل إرسال البلاغ" });
  }
};
