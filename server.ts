import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";

export function generateOfflineSignature(cardId: string, userId: string, timestamp: number): string {
  const secret = 'sham_card_pro_offline_secret_2026_secure';
  const rawData = `${cardId}:${userId}:${timestamp}:${secret}`;
  let hash = 0;
  for (let i = 0; i < rawData.length; i++) {
    const char = rawData.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0; // Convert to 32bit integer
  }
  return "offline_" + Math.abs(hash).toString(16);
}
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  limit,
  orderBy,
  runTransaction
} from 'firebase/firestore';

const firebaseConfig = JSON.parse(fs.readFileSync(path.join(process.cwd(), 'firebase-applet-config.json'), 'utf8'));

const firebaseApp = initializeApp(firebaseConfig);
const firestoreInstance = getFirestore(firebaseApp, firebaseConfig.firestoreDatabaseId);

class DocumentReferenceWrapper {
  constructor(public rawDoc: any) {}

  async get() {
    const snap = await getDoc(this.rawDoc);
    return {
      exists: snap.exists(),
      id: snap.id,
      data: () => snap.data() as any
    };
  }

  async set(data: any) {
    await setDoc(this.rawDoc, data, { merge: true });
  }

  async update(data: any) {
    await updateDoc(this.rawDoc, data);
  }

  async delete() {
    await deleteDoc(this.rawDoc);
  }
}

class QueryWrapper {
  constructor(public colPath: string, public constraints: any[] = []) {}

  where(field: string, op: any, val: any) {
    return new QueryWrapper(this.colPath, [...this.constraints, where(field, op, val)]);
  }

  orderBy(field: string, direction: 'asc' | 'desc' = 'asc') {
    return new QueryWrapper(this.colPath, [...this.constraints, orderBy(field, direction)]);
  }

  limit(n: number) {
    return new QueryWrapper(this.colPath, [...this.constraints, limit(n)]);
  }

  async get() {
    const colRef = collection(firestoreInstance, this.colPath);
    const q = query(colRef, ...this.constraints);
    const snap = await getDocs(q);
    
    const docs = snap.docs.map(d => ({
      exists: d.exists(),
      id: d.id,
      data: () => d.data() as any
    }));

    return {
      empty: snap.empty,
      size: snap.size,
      docs,
      forEach(callback: (doc: any) => void) {
        docs.forEach(callback);
      }
    };
  }
}

class CollectionReferenceWrapper extends QueryWrapper {
  constructor(path: string) {
    super(path);
  }

  doc(docId?: string) {
    const colRef = collection(firestoreInstance, this.colPath);
    const rawDoc = docId ? doc(colRef, docId) : doc(colRef);
    return new DocumentReferenceWrapper(rawDoc);
  }
}

const db = {
  collection(path: string) {
    return new CollectionReferenceWrapper(path);
  },
  async runTransaction<T>(updateFunction: (transaction: any) => Promise<T>): Promise<T> {
    return runTransaction(firestoreInstance, async (rawTransaction) => {
      const tx = {
        async get(docRefWrapper: DocumentReferenceWrapper) {
          const snap = await rawTransaction.get(docRefWrapper.rawDoc);
          return {
            exists: snap.exists(),
            id: snap.id,
            data: () => snap.data() as any
          };
        },
        update(docRefWrapper: DocumentReferenceWrapper, data: any) {
          rawTransaction.update(docRefWrapper.rawDoc, data);
        },
        set(docRefWrapper: DocumentReferenceWrapper, data: any) {
          rawTransaction.set(docRefWrapper.rawDoc, data);
        },
        delete(docRefWrapper: DocumentReferenceWrapper) {
          rawTransaction.delete(docRefWrapper.rawDoc);
        }
      };
      return updateFunction(tx);
    });
  }
};

// Helpers to extract user session
function extractUserPhone(req: express.Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer pilot_token_")) {
    try {
      const base64Str = authHeader.substring("Bearer pilot_token_".length);
      const decoded = Buffer.from(base64Str, 'base64').toString('utf-8');
      const phone = decoded.split('||')[0];
      return phone || null;
    } catch {
      return null;
    }
  }
  return null;
}

async function seedDatabase() {
  try {
    const usersRef = db.collection('users');
    
    // Always ensure the default admin user exists
    const adminPhone = "+963944444444";
    const adminDoc = await usersRef.doc(adminPhone).get();
    if (!adminDoc.exists) {
      console.log("Seeding admin user into Firestore...");
      const adminUser = {
        fullName: "مسؤول النظام",
        phone: adminPhone,
        password: "123456",
        isVerified: true,
        nationalId: "99999999999",
        avatar: "https://ui-avatars.com/api/?name=%D9%85%D8%B3%D8%A4%D9%88%D9%84+%D8%A7%D9%84%D9%86%D8%B8%D8%A7%D9%85&background=d97706&color=fff",
        theme: "light",
        createdAt: Date.now()
      };
      await usersRef.doc(adminPhone).set(adminUser);
    }

    // Always ensure the default user exists
    const defaultUserPhone = "+963931112223";
    const defaultUserDoc = await usersRef.doc(defaultUserPhone).get();
    if (!defaultUserDoc.exists) {
      console.log("Seeding default passenger user into Firestore...");
      const defaultUser = {
        fullName: "أحمد سليمان",
        phone: defaultUserPhone,
        password: "123456",
        isVerified: true,
        nationalId: "01020304050",
        avatar: "https://ui-avatars.com/api/?name=%D8%A3%D8%AD%D9%85%D8%AF+%D8%B3%D9%84%D9%8A%D9%85%D8%A7%D9%85&background=059669&color=fff",
        theme: "light",
        createdAt: Date.now()
      };
      await usersRef.doc(defaultUserPhone).set(defaultUser);
    }

    // Always ensure the default card exists
    const defaultCardId = "card_1";
    const defaultCardDoc = await db.collection('cards').doc(defaultCardId).get();
    if (!defaultCardDoc.exists) {
      console.log("Seeding default card into Firestore...");
      const defaultCard = {
        id: defaultCardId,
        userId: defaultUserPhone,
        alias: "بطاقتي الشخصية",
        cardNumber: "9630 1122 3344 8822",
        balance: 45200,
        type: "digital",
        themeColor: "emerald",
        status: "active",
        is_primary: true,
        category: "general",
        expiryDate: "2030-12-31"
      };
      await db.collection('cards').doc(defaultCardId).set(defaultCard);
    }

    // Ensure buses are seeded
    const busesSnap = await db.collection('buses').limit(1).get();
    if (busesSnap.empty) {
      console.log("Seeding buses into Firestore...");
      const buses = [
        {
          id: "bus_M1",
          route_code: "M1",
          route_name: "ميكرو البرامكة - المزة جبل (خط داخلي قصير)",
          ticket_price: 1000,
          location: { lat: 33.5110, lng: 36.2750 }
        },
        {
          id: "bus_B2",
          route_code: "B2",
          route_name: "باص الدائري الشمالي (خط داخلي قصير)",
          ticket_price: 1000,
          location: { lat: 33.5180, lng: 36.2780 }
        },
        {
          id: "bus_T3",
          route_code: "T3",
          route_name: "ترام المهاجرين التراثي (خط سياحي قصير)",
          ticket_price: 1000,
          location: { lat: 33.5120, lng: 36.2800 }
        },
        {
          id: "bus_L4",
          route_code: "L4",
          route_name: "باص السفر دمشق - حمص (خط طويل بين المحافظات)",
          ticket_price: 2500,
          location: { lat: 34.7320, lng: 36.7130 }
        },
        {
          id: "bus_L5",
          route_code: "L5",
          route_name: "باص السفر دمشق - حلب السريع (خط طويل بين المحافظات)",
          ticket_price: 2500,
          location: { lat: 36.2020, lng: 37.1340 }
        }
      ];
      for (const bus of buses) {
        await db.collection('buses').doc(bus.id).set(bus);
      }
    }

    // Ensure transactions are seeded if none exist
    const txSnap = await db.collection('transactions').limit(1).get();
    if (txSnap.empty) {
      console.log("Seeding default transactions into Firestore...");
      const transactions = [
        {
          id: "tx_1",
          userId: defaultUserPhone,
          cardId: defaultCardId,
          cardName: "بطاقتي الشخصية",
          type: "recharge",
          title: "شحن رصيد - شام كاش",
          subtitle: "طلب شحن إثبات دفع مقبول",
          amount: 25000,
          timestamp: Date.now() - 3600000 * 2
        },
        {
          id: "tx_2",
          userId: defaultUserPhone,
          cardId: defaultCardId,
          cardName: "بطاقتي الشخصية",
          type: "pay",
          title: "باص البرامكة - خط M1",
          subtitle: "تسجيل دخول الحافلة (QR)",
          amount: -1000,
          timestamp: Date.now() - 3600000 * 24
        },
        {
          id: "tx_3",
          userId: defaultUserPhone,
          cardId: defaultCardId,
          cardName: "بطاقتي الشخصية",
          type: "pay",
          title: "باص كراجات السيدة زينب",
          subtitle: "خط الكراجات الجنوبي",
          amount: -1500,
          timestamp: Date.now() - 3600000 * 24 * 3
        }
      ];
      for (const tx of transactions) {
        await db.collection('transactions').doc(tx.id).set(tx);
      }
    }
    
    console.log("Firestore database integrity verified & essential seeding complete.");
  } catch (error) {
    console.error("Error seeding database:", error);
  }
}

async function startServer() {
  await seedDatabase();

  const app = express();
  const PORT = 3000;

  let vite: any = null;
  if (process.env.NODE_ENV !== "production") {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
  }

  app.use(express.json());

  // Helper to extract admin phone from cookie
  function extractAdminPhoneFromCookie(req: express.Request): string | null {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const match = cookieHeader.match(/admin_token=pilot_token_([a-zA-Z0-9+/=]+)/);
    if (!match) return null;
    try {
      const base64Str = match[1];
      const decoded = Buffer.from(base64Str, 'base64').toString('utf-8');
      const phone = decoded.split('||')[0];
      return phone || null;
    } catch {
      return null;
    }
  }

  // Secure Admin Authentication Middleware
  const requireAdmin = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    let phone = extractUserPhone(req);
    if (phone && phone.endsWith('4444')) {
      return next();
    }
    
    phone = extractAdminPhoneFromCookie(req);
    if (phone && phone.endsWith('4444')) {
      return next();
    }

    if (req.path.startsWith('/api/')) {
      return res.status(403).json({ message: "غير مصرح لك بالوصول" });
    } else {
      return res.redirect('/admin-login');
    }
  };

  // Secure Admin Login API (sets HTTP-only cookie)
  app.post("/api/admin/login", async (req, res) => {
    try {
      let { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ message: "يرجى إدخال رقم الهاتف وكلمة المرور." });
      }

      phone = phone.trim();

      // Normalize phone format for easier login in development
      let searchPhone = phone;
      if (searchPhone.startsWith('09') && searchPhone.length === 10) {
        searchPhone = '+963' + searchPhone.substring(1);
      } else if (searchPhone.startsWith('9') && searchPhone.length === 9) {
        searchPhone = '+963' + searchPhone;
      }

      if (!searchPhone.endsWith('4444')) {
        return res.status(403).json({ message: "هذه البوابة مخصصة لمسؤولي النظام فقط." });
      }

      // Try searching with normalized phone first, then original input if not found
      let userDocRef = db.collection('users').doc(searchPhone);
      let userDoc = await userDocRef.get();
      
      if (!userDoc.exists && searchPhone !== phone) {
        userDocRef = db.collection('users').doc(phone);
        userDoc = await userDocRef.get();
      }

      if (!userDoc.exists) {
        return res.status(401).json({ message: "رقم المشرف غير صحيح أو الحساب غير نشط." });
      }

      const userData = userDoc.data();
      if (userData?.password !== password) {
        return res.status(401).json({ message: "رقم الهاتف أو كلمة المرور غير صحيحة." });
      }

      // Generate secure token with the matched document ID phone
      const matchedPhone = userDoc.id;
      const token = `pilot_token_${Buffer.from(matchedPhone + '||' + Date.now()).toString('base64')}`;
      
      // Set secure HTTP-only cookie
      res.setHeader('Set-Cookie', `admin_token=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);
      res.json({ token, role: 'admin', user: userData });
    } catch (err) {
      console.error("Admin Login Error:", err);
      res.status(500).json({ message: "فشل الدخول للمخدم الآمن." });
    }
  });

  // Secure Admin Logout API
  app.post("/api/admin/logout", async (req, res) => {
    try {
      res.setHeader('Set-Cookie', 'admin_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      res.json({ success: true, message: "تم تسجيل الخروج بنجاح وسحب ملفات التعريف." });
    } catch (err) {
      console.error("Admin Logout Error:", err);
      res.status(500).json({ message: "فشل تسجيل الخروج من المخدم." });
    }
  });

  // Secure Recharge Requests APIs
  app.post("/api/recharge-requests", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) return res.status(401).json({ message: "غير مصرح" });

      const { amount, receiptImage, paymentMethod, userName } = req.body;
      if (!amount) {
        return res.status(400).json({ message: "الرجاء تحديد قيمة الشحن المطلوبة." });
      }

      const id = "req_" + Math.random().toString(36).substr(2, 9);
      const newRequest = {
        id,
        userId: phone,
        userName: userName || "مستخدم بطاقة",
        amount: Number(amount),
        receiptImage: receiptImage || 'none',
        paymentMethod: paymentMethod || 'Syriatel Cash',
        status: "pending",
        timestamp: Date.now()
      };

      await db.collection('recharge_requests').doc(id).set(newRequest);
      res.json({ success: true, request: newRequest });
    } catch (err) {
      res.status(500).json({ message: "فشل إرسال طلب الشحن" });
    }
  });

  app.get("/api/recharge-requests", requireAdmin, async (req, res) => {
    try {
      const requestsSnap = await db.collection('recharge_requests').get();
      const requests: any[] = [];
      requestsSnap.forEach(doc => requests.push(doc.data()));
      requests.sort((a, b) => b.timestamp - a.timestamp);
      res.json(requests);
    } catch (err) {
      res.status(500).json({ message: "فشل جلب طلبات الشحن" });
    }
  });

  app.post("/api/recharge-requests/:id/approve", requireAdmin, async (req, res) => {
    try {
      const requestId = req.params.id as string;
      const reqRef = db.collection('recharge_requests').doc(requestId);

      // Fetch user's cards outside the transaction function
      const reqDocOutside = await reqRef.get();
      if (!reqDocOutside.exists) {
        return res.status(404).json({ message: "طلب الشحن غير موجود." });
      }
      const requestDataOutside = reqDocOutside.data();
      const userId = requestDataOutside?.userId;

      const cardsSnap = await db.collection('cards').where('userId', '==', userId).get();
      let primaryCardId = "";
      let primaryCardData: any = null;

      cardsSnap.forEach(doc => {
        const c = doc.data();
        if (c.is_primary || !primaryCardData) {
          primaryCardData = c;
          primaryCardId = doc.id;
        }
      });

      const result = await db.runTransaction(async (transaction) => {
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists) {
          throw new Error("NOT_FOUND");
        }
        const requestData = reqDoc.data();
        if (!requestData || requestData.status !== 'pending') {
          throw new Error("ALREADY_PROCESSED");
        }

        // Update the status of recharge request inside transaction
        transaction.update(reqRef, { status: 'approved', approvedAt: Date.now() });

        if (primaryCardId) {
          const cardRef = db.collection('cards').doc(primaryCardId);
          const cardDoc = await transaction.get(cardRef);
          if (cardDoc.exists) {
            const cardVal = cardDoc.data();
            const amount = Number(requestData.amount);
            
            if (cardVal.type === 'physical') {
              const pending = Number(cardVal.pendingNfcAmount || 0) + amount;
              transaction.update(cardRef, { pendingNfcAmount: pending });
            } else {
              const balance = Number(cardVal.balance || 0) + amount;
              transaction.update(cardRef, { balance: balance });
            }

            // Write transaction document
            const txId = "tx_" + Math.random().toString(36).substr(2, 9);
            const txObj = {
              id: txId,
              userId,
              cardId: primaryCardId,
              cardName: cardVal.alias || "البطاقة الأساسية",
              type: "recharge",
              title: "شحن رصيد مقبول",
              subtitle: cardVal.type === 'physical' ? "معلق بانتظار تفعيل NFC" : "تم شحن الرصيد مباشرة",
              amount,
              timestamp: Date.now()
            };
            const txRef = db.collection('transactions').doc(txId);
            transaction.set(txRef, txObj);
          }
        }

        return { success: true };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Approve recharge error:", err);
      if (err.message === "NOT_FOUND") {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }
      if (err.message === "ALREADY_PROCESSED") {
        return res.status(400).json({ message: "تمت معالجة هذا الطلب مسبقاً." });
      }
      res.status(500).json({ message: "فشل اعتماد الطلب" });
    }
  });

  app.post("/api/recharge-requests/:id/reject", requireAdmin, async (req, res) => {
    try {
      const requestId = req.params.id as string;
      const { reason } = req.body;
      const rejectReason = reason || "إيصال دفع غير صالح أو غير مكتمل البيانات";

      const reqRef = db.collection('recharge_requests').doc(requestId);

      const result = await db.runTransaction(async (transaction) => {
        const reqDoc = await transaction.get(reqRef);
        if (!reqDoc.exists) {
          throw new Error("NOT_FOUND");
        }
        const requestData = reqDoc.data();
        if (!requestData || requestData.status !== 'pending') {
          throw new Error("ALREADY_PROCESSED");
        }

        transaction.update(reqRef, { 
          status: 'rejected', 
          rejectionReason: rejectReason,
          rejectedAt: Date.now() 
        });

        return { success: true };
      });

      res.json(result);
    } catch (err: any) {
      console.error("Reject recharge error:", err);
      if (err.message === "NOT_FOUND") {
        return res.status(404).json({ message: "الطلب غير موجود" });
      }
      if (err.message === "ALREADY_PROCESSED") {
        return res.status(400).json({ message: "تمت معالجة هذا الطلب مسبقاً." });
      }
      res.status(500).json({ message: "فشل رفض الطلب." });
    }
  });

  // Admin Directory Fetch
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const usersSnap = await db.collection('users').get();
      const users: any[] = [];
      usersSnap.forEach(doc => {
        const u = doc.data();
        delete u.password;
        users.push(u);
      });
      res.json(users);
    } catch (err) {
      res.status(500).json({ message: "فشل جلب الركاب" });
    }
  });

  app.get("/api/admin/cards", requireAdmin, async (req, res) => {
    try {
      const cardsSnap = await db.collection('cards').get();
      const cards: any[] = [];
      cardsSnap.forEach(doc => cards.push(doc.data()));
      res.json(cards);
    } catch (err) {
      res.status(500).json({ message: "فشل جلب البطاقات" });
    }
  });

  // Secure Admin Financial Report Endpoint
  app.get("/api/admin/financial-report", requireAdmin, async (req, res) => {
    try {
      // 1. Fetch all bus payments
      const busPaymentsSnap = await db.collection('bus_payments').get();
      const busPayments: any[] = [];
      busPaymentsSnap.forEach(doc => busPayments.push(doc.data()));

      // 2. Fetch all recharge requests
      const rechargeRequestsSnap = await db.collection('recharge_requests').get();
      const rechargeRequests: any[] = [];
      rechargeRequestsSnap.forEach(doc => rechargeRequests.push(doc.data()));

      // 3. Fetch all buses for master metadata
      const busesSnap = await db.collection('buses').get();
      const busesMap: { [key: string]: any } = {};
      busesSnap.forEach(doc => {
        const bus = doc.data();
        busesMap[bus.id] = bus;
      });

      // 4. Calculate stats
      let totalBusRevenue = 0;
      let totalTransactionsCount = busPayments.length;
      const busStats: { [key: string]: { busId: string; name: string; code: string; revenue: number; passengersCount: number } } = {};

      // Seed stats with known buses or default
      Object.values(busesMap).forEach((bus: any) => {
        busStats[bus.id] = {
          busId: bus.id,
          name: bus.route_name,
          code: bus.route_code,
          revenue: 0,
          passengersCount: 0
        };
      });

      busPayments.forEach(pay => {
        const busId = pay.busId || 'bus_M1';
        const amount = Number(pay.amount || 1000);
        totalBusRevenue += amount;

        if (!busStats[busId]) {
          const matchedBus = busesMap[busId];
          busStats[busId] = {
            busId: busId,
            name: matchedBus ? matchedBus.route_name : (pay.busName || "ميكرو البرامكة - المزة جبل"),
            code: matchedBus ? matchedBus.route_code : (busId === 'bus_M1' ? 'M1' : 'BUS'),
            revenue: 0,
            passengersCount: 0
          };
        }
        busStats[busId].revenue += amount;
        busStats[busId].passengersCount += 1;
      });

      // Recharge Request stats
      let approvedRechargesTotal = 0;
      let approvedRechargesCount = 0;
      let pendingRechargesTotal = 0;
      let pendingRechargesCount = 0;
      let rejectedRechargesTotal = 0;
      let rejectedRechargesCount = 0;

      rechargeRequests.forEach(reqObj => {
        const amt = Number(reqObj.amount || 0);
        if (reqObj.status === 'approved') {
          approvedRechargesTotal += amt;
          approvedRechargesCount += 1;
        } else if (reqObj.status === 'pending') {
          pendingRechargesTotal += amt;
          pendingRechargesCount += 1;
        } else if (reqObj.status === 'rejected') {
          rejectedRechargesTotal += amt;
          rejectedRechargesCount += 1;
        }
      });

      // System counts
      const usersSnap = await db.collection('users').get();
      const cardsSnap = await db.collection('cards').get();

      res.json({
        totalBusRevenue,
        totalTransactionsCount,
        busStats: Object.values(busStats),
        rechargeStats: {
          approvedAmount: approvedRechargesTotal,
          approvedCount: approvedRechargesCount,
          pendingAmount: pendingRechargesTotal,
          pendingCount: pendingRechargesCount,
          rejectedAmount: rejectedRechargesTotal,
          rejectedCount: rejectedRechargesCount
        },
        systemStats: {
          totalUsers: usersSnap.size,
          totalCards: cardsSnap.size
        },
        recentPayments: busPayments.sort((a,b) => b.timestamp - a.timestamp).slice(0, 30)
      });
    } catch (err) {
      console.error("Financial report error:", err);
      res.status(500).json({ message: "فشل استخراج التقرير المالي." });
    }
  });

  // Synchronize NFC pending balance to physical card balance
  app.post("/api/cards/sync-nfc", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) return res.status(401).json({ message: "غير مصرح بالدخول" });

      const { cardId } = req.body;
      if (!cardId) {
        return res.status(400).json({ message: "الرجاء تحديد معرف البطاقة." });
      }

      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة غير موجودة." });
      }

      const cardData = cardDoc.data();
      if (cardData.userId !== phone) {
        return res.status(403).json({ message: "غير مصرح لك بتحديث هذه البطاقة." });
      }

      if (cardData.type !== 'physical') {
        return res.status(400).json({ message: "هذه الميزة مخصصة للبطاقات الفيزيائية فقط." });
      }

      const pendingAmount = Number(cardData.pendingNfcAmount || 0);
      if (pendingAmount <= 0) {
        return res.status(400).json({ message: "لا يوجد رصيد معلق بانتظار الشحن على هذه البطاقة." });
      }

      const newBalance = Number(cardData.balance || 0) + pendingAmount;
      
      // Update balance and clear pending amount
      await cardRef.update({
        balance: newBalance,
        pendingNfcAmount: 0
      });

      // Write NFC sync transaction
      const txId = "tx_" + Math.random().toString(36).substr(2, 9);
      const txObj = {
        id: txId,
        userId: phone,
        cardId: cardId,
        cardName: cardData.alias || "البطاقة الفيزيائية",
        type: "recharge",
        title: "تفريغ شحن عبر NFC نجح",
        subtitle: "تحديث الرصيد اللاتلامسي",
        amount: pendingAmount,
        timestamp: Date.now()
      };
      await db.collection('transactions').doc(txId).set(txObj);

      res.json({
        success: true,
        message: `تم شحن بطاقتك الفيزيائية بنجاح!`,
        newBalance: newBalance,
        pendingNfcAmount: 0
      });
    } catch (err) {
      console.error("NFC sync error:", err);
      res.status(500).json({ message: "فشل تحديث البطاقة عبر NFC." });
    }
  });

  // --- Admin Fleet & Trips APIs ---
  app.post("/api/admin/fleet/create", requireAdmin, async (req, res) => {
    try {
      const { ownerName, plateNumber, routeName, routeCode, ticketPrice } = req.body;
      if (!ownerName || !plateNumber || !routeName || !routeCode || ticketPrice === undefined) {
        return res.status(400).json({ message: "جميع المدخلات (اسم صاحب الباص، نمرة السيارة، اسم خط النقل والمسار، نوع واسطة النقل، والتعرفة) مطلوبة." });
      }

      // Generate cryptographically secure trip credentials
      const tripCodeBytes = crypto.randomBytes(8);
      const tripCode = Array.from(tripCodeBytes, byte => (byte % 10).toString()).join('');
      
      const passwordBytes = crypto.randomBytes(5);
      const password = Array.from(passwordBytes, byte => (byte % 10).toString()).join('');
      const passwordHash = crypto.createHash('sha256').update(password).digest('hex');

      const tripId = "trip_" + Math.random().toString(36).substr(2, 9);
      const newTrip = {
        id: tripId,
        tripCode,
        password,
        passwordHash,
        ownerName,
        plateNumber,
        routeId: "custom_" + tripId,
        routeName,
        routeCode,
        ticketPrice: Number(ticketPrice),
        status: "active",
        createdAt: Date.now()
      };

      await db.collection('bus_trips').doc(tripId).set(newTrip);

      res.json({ success: true, trip: newTrip });
    } catch (err) {
      console.error("Fleet creation error:", err);
      res.status(500).json({ message: "فشل إنشاء الرحلة الجديدة سحابياً." });
    }
  });

  app.get("/api/admin/fleet/trips", requireAdmin, async (req, res) => {
    try {
      const tripsSnap = await db.collection('bus_trips').get();
      const trips: any[] = [];
      tripsSnap.forEach(doc => trips.push(doc.data()));
      trips.sort((a, b) => b.createdAt - a.createdAt);
      res.json(trips);
    } catch (err) {
      res.status(500).json({ message: "فشل جلب الرحلات المسجلة." });
    }
  });

  // --- Admin Card Action APIs ---
  app.post("/api/admin/cards/create", requireAdmin, async (req, res) => {
    try {
      const { alias, cardNumber, balance, type, themeColor, category, userPhone } = req.body;
      if (!cardNumber || !userPhone) {
        return res.status(400).json({ message: "رقم البطاقة (الرقم التسلسلي) ورقم هاتف المستخدم مطلوبان." });
      }

      // Check if user exists
      const userDoc = await db.collection('users').doc(userPhone).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: "رقم هاتف المستخدم غير مسجل بالتطبيق بعد." });
      }

      const cardId = "card_" + Math.random().toString(36).substr(2, 9);
      const cardObj = {
        id: cardId,
        userId: userPhone,
        alias: alias || (type === 'digital' ? "بطاقة رقمية جديدة" : "بطاقة فيزيائية جديدة"),
        cardNumber: cardNumber,
        balance: Number(balance || 0),
        type: type || "digital",
        themeColor: themeColor || "emerald",
        status: "active",
        is_primary: false,
        category: category || "general",
        expiryDate: "2030-12-31"
      };

      await db.collection('cards').doc(cardId).set(cardObj);
      res.json({ success: true, card: cardObj });
    } catch (err) {
      res.status(500).json({ message: "فشل إنشاء البطاقة سحابياً." });
    }
  });

  app.post("/api/admin/cards/:id/toggle-block", requireAdmin, async (req, res) => {
    try {
      const cardId = req.params.id as string;
      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة المطلوبة غير موجودة." });
      }

      const currentStatus = cardDoc.data()?.status || "active";
      const nextStatus = currentStatus === "active" ? "blocked" : "active";
      await cardRef.update({ status: nextStatus });

      res.json({ success: true, status: nextStatus });
    } catch (err) {
      res.status(500).json({ message: "فشل تجميد/تفعيل البطاقة." });
    }
  });

  // Direct Recharge API for Admins
  app.post("/api/admin/cards/:id/recharge", requireAdmin, async (req, res) => {
    try {
      const cardId = req.params.id as string;
      const { amount } = req.body;
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ message: "مبلغ الشحن غير صالح." });
      }

      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة المطلوبة غير موجودة." });
      }

      const cardData = cardDoc.data();
      const currentBalance = Number(cardData?.balance || 0);
      const newBalance = currentBalance + amount;

      await cardRef.update({ balance: newBalance });

      // Create a direct transaction record for history
      const txId = "tx_admin_recharge_" + Math.random().toString(36).substr(2, 9);
      const txObj = {
        id: txId,
        userId: cardData?.userId || "unknown",
        cardId: cardId,
        cardName: cardData?.alias || "بطاقة شام",
        type: "recharge",
        title: "شحن مباشر من الإدارة",
        subtitle: "اعتماد مالي فوري",
        amount: amount,
        timestamp: Date.now()
      };
      await db.collection('transactions').doc(txId).set(txObj);

      res.json({ success: true, newBalance, message: `تم شحن البطاقة بنجاح بمبلغ ${amount.toLocaleString()} ل.س` });
    } catch (err) {
      console.error("Direct recharge error:", err);
      res.status(500).json({ message: "فشل شحن رصيد البطاقة سحابياً." });
    }
  });

  // Direct Status Update API for Admins (Active, Suspended, Blocked)
  app.post("/api/admin/cards/:id/update-status", requireAdmin, async (req, res) => {
    try {
      const cardId = req.params.id as string;
      const { status } = req.body;
      if (!['active', 'suspended', 'blocked'].includes(status)) {
        return res.status(400).json({ message: "حالة البطاقة غير صالحة." });
      }

      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة المطلوبة غير موجودة." });
      }

      await cardRef.update({ status });
      res.json({ success: true, status, message: "تم تحديث حالة البطاقة بنجاح سحابياً." });
    } catch (err) {
      console.error("Update status error:", err);
      res.status(500).json({ message: "فشل تحديث حالة البطاقة سحابياً." });
    }
  });

  // Direct Delete Card API for Admins
  app.delete("/api/admin/cards/:id", requireAdmin, async (req, res) => {
    try {
      const cardId = req.params.id as string;
      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة المطلوبة غير موجودة." });
      }

      await cardRef.delete();
      res.json({ success: true, message: "تم حذف وإلغاء البطاقة بالكامل بنجاح سحابياً." });
    } catch (err) {
      console.error("Direct delete error:", err);
      res.status(500).json({ message: "فشل حذف البطاقة سحابياً." });
    }
  });

  // --- Driver Trip Authentication & Status APIs ---
  app.post("/api/driver/login", async (req, res) => {
    try {
      const { tripCode, password } = req.body;
      if (!tripCode || !password) {
        return res.status(400).json({ message: "يرجى إدخال رمز الرحلة وكلمة المرور." });
      }

      const tripsSnap = await db.collection('bus_trips')
        .where('tripCode', '==', tripCode)
        .get();

      if (tripsSnap.empty) {
        return res.status(401).json({ message: "رمز الرحلة أو كلمة السر غير مطابقة مع السحابة." });
      }

      let matchedTrip: any = null;
      let passwordMatched = false;
      const inputHash = crypto.createHash('sha256').update(password).digest('hex');

      tripsSnap.forEach(doc => {
        const trip = doc.data();
        if (trip.password === password || trip.passwordHash === inputHash) {
          matchedTrip = trip;
          passwordMatched = true;
        }
      });

      if (!passwordMatched || !matchedTrip) {
        return res.status(401).json({ message: "رمز الرحلة أو كلمة السر غير مطابقة مع السحابة." });
      }

      if (matchedTrip.status !== 'active') {
        return res.status(400).json({ message: "هذه الرحلة مغلقة أو منتهية العمل مسبقاً." });
      }

      // Generate driver session token
      const driverToken = `driver_token_${Buffer.from(matchedTrip.id + '||' + Date.now()).toString('base64')}`;
      res.setHeader('Set-Cookie', `driver_token=${driverToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=86400`);

      res.json({ success: true, trip: matchedTrip, token: driverToken });
    } catch (err) {
      res.status(500).json({ message: "فشل مصادقة السائق." });
    }
  });

  app.post("/api/driver/logout", async (req, res) => {
    try {
      const { tripId } = req.body;
      if (!tripId) {
        return res.status(400).json({ message: "معرف الرحلة مطلوب." });
      }

      // Deactivate the trip
      await db.collection('bus_trips').doc(tripId).update({ status: 'completed' });

      res.setHeader('Set-Cookie', 'driver_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ message: "فشل تسجيل خروج الرحلة." });
    }
  });

  app.get("/api/driver/active-trip", async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      let driverToken = null;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        driverToken = authHeader.substring(7);
      } else {
        const cookieHeader = req.headers.cookie;
        const match = cookieHeader?.match(/driver_token=driver_token_([a-zA-Z0-9+/=]+)/);
        if (match) {
          driverToken = match[1];
        }
      }

      if (!driverToken) {
        return res.status(401).json({ message: "لا توجد رحلة نشطة حالياً." });
      }

      const decoded = Buffer.from(driverToken, 'base64').toString('utf-8');
      const tripId = decoded.split('||')[0];

      const tripDoc = await db.collection('bus_trips').doc(tripId).get();
      if (!tripDoc.exists) {
        return res.status(404).json({ message: "تفاصيل الرحلة غير موجودة." });
      }

      res.json(tripDoc.data());
    } catch (err) {
      res.status(401).json({ message: "انتهت صلاحية جلسة العمل." });
    }
  });

  const getAI = () => {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
       console.warn("WARNING: GEMINI_API_KEY is missing. AI features will fallback to helpful mockup responses.");
       return null;
    }
    return new GoogleGenAI({ apiKey: key });
  };

  // Auth Register
  app.post("/api/v1/auth/register", async (req, res) => {
    try {
      const { fullName, phone, password } = req.body;
      if (!fullName || !phone || !password) {
        return res.status(400).json({ message: "يرجى تعبئة كافة الحقول المطلوبة." });
      }

      const userDocRef = db.collection('users').doc(phone);
      const userDoc = await userDocRef.get();
      if (userDoc.exists) {
        return res.status(400).json({ message: "رقم الهاتف المدخل مسجل مسبقاً في النظام." });
      }

      const userObj = {
        fullName,
        phone,
        password,
        isVerified: true,
        nationalId: "0" + Math.floor(1000000000 + Math.random() * 9000000000),
        avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=059669&color=fff`,
        theme: "light",
        createdAt: Date.now()
      };

      await userDocRef.set(userObj);

      // Create a default primary digital card with 0 SP starting balance
      const cardId = "card_" + Math.random().toString(36).substr(2, 9);
      const cardObj = {
        id: cardId,
        userId: phone,
        alias: "بطاقتي الشخصية",
        cardNumber: `9630 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        balance: 0,
        type: "digital",
        themeColor: "emerald",
        status: "active",
        is_primary: true,
        category: "general",
        expiryDate: "2030-12-31"
      };
      await db.collection('cards').doc(cardId).set(cardObj);

      const token = `pilot_token_${Buffer.from(phone + '||' + Date.now()).toString('base64')}`;
      const role = phone.endsWith('4444') ? 'admin' : 'passenger';

      res.json({ token, role, user: userObj });
    } catch (err: any) {
      console.error("Register Error:", err);
      res.status(500).json({ message: "فشل إنشاء الحساب الجديد. يرجى المحاولة لاحقاً." });
    }
  });

  // Auth Login
  app.post("/api/v1/auth/login", async (req, res) => {
    try {
      const { phone, password } = req.body;
      if (!phone || !password) {
        return res.status(400).json({ message: "يرجى إدخال رقم الهاتف وكلمة المرور." });
      }

      const userDocRef = db.collection('users').doc(phone);
      const userDoc = await userDocRef.get();
      if (!userDoc.exists) {
        return res.status(401).json({ message: "رقم الهاتف أو كلمة المرور غير صحيحة." });
      }

      const userData = userDoc.data();
      if (userData?.password !== password) {
        return res.status(401).json({ message: "رقم الهاتف أو كلمة المرور غير صحيحة." });
      }

      const token = `pilot_token_${Buffer.from(phone + '||' + Date.now()).toString('base64')}`;
      const role = phone.endsWith('4444') ? 'admin' : 'passenger';

      res.json({ token, role, user: userData });
    } catch (err: any) {
      console.error("Login Error:", err);
      res.status(500).json({ message: "فشل عملية تسجيل الدخول. يرجى المحاولة لاحقاً." });
    }
  });

  // Dashboard Unified Fetch
  app.get("/api/dashboard", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) {
        return res.status(401).json({ message: "غير مصرح بالدخول" });
      }

      const userDoc = await db.collection('users').doc(phone).get();
      if (!userDoc.exists) {
        return res.status(404).json({ message: "المستخدم غير موجود" });
      }

      const userData = userDoc.data();

      // Get cards
      const cardsSnap = await db.collection('cards').where('userId', '==', phone).get();
      const cards: any[] = [];
      cardsSnap.forEach(doc => {
        cards.push(doc.data());
      });

      // Get transactions (last 15 for history feed, client slices as needed)
      const transactionsSnap = await db.collection('transactions')
        .where('userId', '==', phone)
        .get();
      
      let transactions: any[] = [];
      transactionsSnap.forEach(doc => {
        transactions.push(doc.data());
      });
      // Sort in-memory to prevent requiring composite indexes in Firestore
      transactions.sort((a, b) => b.timestamp - a.timestamp);
      transactions = transactions.slice(0, 15);

      res.json({
        user: userData,
        cards,
        transactions
      });
    } catch (err: any) {
      console.error("Dashboard error:", err);
      res.status(500).json({ message: "فشل تحميل بيانات لوحة التحكم." });
    }
  });

  // Get Cards List
  app.get("/api/cards", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) return res.status(401).json({ message: "غير مصرح" });

      const cardsSnap = await db.collection('cards').where('userId', '==', phone).get();
      const cards: any[] = [];
      cardsSnap.forEach(doc => cards.push(doc.data()));
      res.json(cards);
    } catch (err) {
      res.status(500).json({ message: "خطأ في خادم البطاقات" });
    }
  });

  // Add Card
  app.post("/api/cards/add", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) return res.status(401).json({ message: "غير مصرح" });

      const { alias, cardNumber, balance, type, themeColor, category } = req.body;

      const cardId = "card_" + Math.random().toString(36).substr(2, 9);
      const cardObj = {
        id: cardId,
        userId: phone,
        alias: alias || (type === 'digital' ? "بطاقة رقمية" : "بطاقة فيزيائية"),
        cardNumber: cardNumber || `9630 ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)} ${Math.floor(1000 + Math.random() * 9000)}`,
        balance: balance || 0,
        type: type || "digital",
        themeColor: themeColor || "rose",
        status: "active",
        is_primary: false,
        category: category || "general",
        expiryDate: "2030-12-31"
      };

      await db.collection('cards').doc(cardId).set(cardObj);
      res.json(cardObj);
    } catch (err) {
      res.status(500).json({ message: "فشل إضافة البطاقة." });
    }
  });

  // Delete Card
  app.delete("/api/cards/:id", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) return res.status(401).json({ message: "غير مصرح" });

      const cardId = req.params.id;
      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();

      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }

      const cardData = cardDoc.data();
      if (cardData && cardData.userId !== phone) {
        return res.status(403).json({ message: "غير مسموح لك بحذف هذه البطاقة" });
      }

      await cardRef.delete();
      res.json({ message: "تم حذف البطاقة بنجاح" });
    } catch (err) {
      res.status(500).json({ message: "فشل حذف البطاقة." });
    }
  });

  // Rename Card
  app.patch("/api/cards/:id", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) return res.status(401).json({ message: "غير مصرح" });

      const cardId = req.params.id;
      const { alias } = req.body;
      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();

      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }

      const cardData = cardDoc.data();
      if (cardData && cardData.userId !== phone) {
        return res.status(403).json({ message: "غير مسموح لك بتعديل هذه البطاقة" });
      }

      await cardRef.update({ alias });
      res.json({ ...cardData, alias });
    } catch (err) {
      res.status(500).json({ message: "فشل تعديل اسم البطاقة." });
    }
  });

  // Offers API
  app.get("/api/offers", async (req, res) => {
    try {
      const offersSnap = await db.collection('offers').get();
      let offers: any[] = [];
      offersSnap.forEach(doc => {
        offers.push(doc.data());
      });
      
      if (offers.length === 0) {
        const defaultOffers = [
          {
            id: "offer_1",
            title: "عرض الشحن الإضافي 10% +",
            description: "اشحن بطاقتك الرقمية بقيمة 50,000 ل.س أو أكثر عبر شام كاش واحصل على بونص 10% رصيد إضافي فوراً!",
            discount: "10%+",
            code: "SHAM10",
            expiryDate: "2026-08-31",
            active: true,
            createdAt: Date.now()
          },
          {
            id: "offer_2",
            title: "عرض الطلاب الجامعيين",
            description: "حسم خاص لجميع الطلاب حاملي البطاقات الجامعية على خط البرامكة ومزة أوتوستراد. فعل العرض الآن!",
            discount: "حسم للطلاب",
            code: "STUDENT",
            expiryDate: "2026-12-31",
            active: true,
            createdAt: Date.now() - 86400000
          },
          {
            id: "offer_3",
            title: "تذكرة الجمعة المجانية",
            description: "ادفع تذكرتك عبر مسح رمز الـ QR كل يوم جمعة واحصل على رحلتك مجاناً بالكامل. العرض ساري لجميع الخطوط.",
            discount: "مجاني",
            code: "FRIDAY",
            expiryDate: "2026-09-30",
            active: true,
            createdAt: Date.now() - 172800000
          }
        ];
        for (const off of defaultOffers) {
          await db.collection('offers').doc(off.id).set(off);
          offers.push(off);
        }
      }

      offers.sort((a, b) => b.createdAt - a.createdAt);
      res.json(offers);
    } catch (err: any) {
      console.error("Error fetching offers:", err);
      res.status(500).json({ message: "فشل جلب العروض" });
    }
  });

  app.post("/api/offers", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone || !phone.endsWith('4444')) {
        return res.status(403).json({ message: "غير مصرح لك بإدارة العروض" });
      }

      const { title, description, discount, code, expiryDate } = req.body;
      if (!title || !description) {
        return res.status(400).json({ message: "يرجى ملء الحقول المطلوبة" });
      }

      const id = "offer_" + Math.random().toString(36).substr(2, 9);
      const newOffer = {
        id,
        title,
        description,
        discount: discount || "",
        code: code || "",
        expiryDate: expiryDate || "",
        active: true,
        createdAt: Date.now()
      };

      await db.collection('offers').doc(id).set(newOffer);
      res.json({ success: true, offer: newOffer });
    } catch (err: any) {
      console.error("Error creating offer:", err);
      res.status(500).json({ message: "فشل إضافة العرض" });
    }
  });

  app.delete("/api/offers/:id", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone || !phone.endsWith('4444')) {
        return res.status(403).json({ message: "غير مصرح لك بإدارة العروض" });
      }

      const offerId = req.params.id;
      await db.collection('offers').doc(offerId).delete();
      res.json({ success: true });
    } catch (err: any) {
      console.error("Error deleting offer:", err);
      res.status(500).json({ message: "فشل حذف العرض" });
    }
  });

  // Quick QR Payment
  app.post("/api/trips/pay-qr", async (req, res) => {
    try {
      const { cardId, busId, tripId } = req.body;
      if (!cardId) {
        return res.status(400).json({ message: "معرف البطاقة مطلوب للعملية." });
      }

      // Fetch Card
      const cardRef = db.collection('cards').doc(cardId);
      const cardDoc = await cardRef.get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة المطلوبة غير موجودة." });
      }

      const cardData = cardDoc.data();
      
      // Determine passenger phone - fallback to card's owner or default user if token/cookie is missing
      let phone = extractUserPhone(req);
      if (!phone) {
        phone = cardData?.userId || "+963931112223";
      }

      // Fetch Passenger Name for Driver simulator
      const userDoc = await db.collection('users').doc(phone).get();
      const passengerName = userDoc.exists ? (userDoc.data()?.fullName || "راكب") : "راكب";

      // Resolve trip or bus details
      let ticketPrice = 1000;
      let busName = "باص دمشق السريع";
      let routeCode = "M1";
      let resolvedBusId = busId || "bus_M1";
      let resolvedTripId = tripId || "";

      if (tripId) {
        const tripDoc = await db.collection('bus_trips').doc(tripId).get();
        if (tripDoc.exists) {
          const tripData = tripDoc.data();
          ticketPrice = Number(tripData?.ticketPrice || 1000);
          busName = tripData?.routeName || "باص دمشق السريع";
          routeCode = tripData?.routeCode || "M1";
          resolvedBusId = tripData?.routeId || "bus_M1";
          resolvedTripId = tripId;
        }
      } else if (busId) {
        const busDoc = await db.collection('buses').doc(busId).get();
        if (busDoc.exists) {
          const busData = busDoc.data();
          ticketPrice = busData?.ticket_price || 1000;
          busName = busData?.route_name || "باص دمشق السريع";
          routeCode = busData?.route_code || "M1";
        }
      }

      const paymentId = "pm_" + Math.random().toString(36).substr(2, 9);

      // Rule: Check if Card is Blocked/Frozen/Suspended
      if (cardData?.status === "blocked" || cardData?.status === "suspended") {
        const isBlocked = cardData?.status === "blocked";
        // Log FAILED payment to bus_payments for driver realtime notification
        const failedObj = {
          id: paymentId,
          busId: resolvedBusId,
          tripId: resolvedTripId,
          amount: ticketPrice,
          passengerName: passengerName,
          status: "failed",
          errorReason: isBlocked ? "البطاقة محظورة وملغاة!" : "البطاقة موقوفة مؤقتاً!",
          timestamp: Date.now()
        };
        await db.collection('bus_payments').doc(paymentId).set(failedObj);

        return res.status(400).json({ 
          message: isBlocked 
            ? "هذه البطاقة محظورة وملغاة من قبل الإدارة!" 
            : "هذه البطاقة موقوفة مؤقتاً (مجمدة) من قبل الإدارة!" 
        });
      }

      const currentBalance = cardData?.balance || 0;
      if (currentBalance < ticketPrice) {
        // Log FAILED payment due to insufficient balance
        const failedObj = {
          id: paymentId,
          busId: resolvedBusId,
          tripId: resolvedTripId,
          amount: ticketPrice,
          passengerName: passengerName,
          status: "failed",
          errorReason: "الرصيد غير كافٍ!",
          timestamp: Date.now()
        };
        await db.collection('bus_payments').doc(paymentId).set(failedObj);

        return res.status(400).json({ message: "رصيد البطاقة غير كافٍ لإتمام عملية العبور." });
      }

      const newBalance = currentBalance - ticketPrice;
      await cardRef.update({ balance: newBalance });

      // Get the bus coordinates for Geofencing Audit tracking
      let lat = 33.5110;
      let lng = 36.2750;
      const busDocForCoords = await db.collection('buses').doc(resolvedBusId).get();
      if (busDocForCoords.exists) {
        const bData = busDocForCoords.data();
        if (bData?.location) {
          lat = Number(bData.location.lat || lat);
          lng = Number(bData.location.lng || lng);
        }
      }

      // Calculate dynamic price multiplier (e.g. Peak time/hour zone multiplier)
      const currentHour = new Date().getHours();
      const isPeakHour = (currentHour >= 8 && currentHour <= 10) || (currentHour >= 16 && currentHour <= 18);
      const priceMultiplier = isPeakHour ? 1.5 : 1.0;

      // Record transaction
      const txId = "tx_" + Math.random().toString(36).substr(2, 9);
      const txObj = {
        id: txId,
        userId: phone,
        cardId: cardId,
        cardName: cardData?.alias || "البطاقة الأساسية",
        type: "pay",
        title: `باص العبور - خط ${routeCode}`,
        subtitle: busName,
        amount: -ticketPrice,
        timestamp: Date.now(),
        gpsLog: { lat, lng },
        priceMultiplier
      };
      await db.collection('transactions').doc(txId).set(txObj);

      // Log SUCCESS payment to bus_payments collection for the driver screen
      const paymentObj = {
        id: paymentId,
        busId: resolvedBusId,
        tripId: resolvedTripId,
        amount: ticketPrice,
        balanceLeft: newBalance,
        passengerName: passengerName,
        status: "success",
        timestamp: Date.now(),
        gpsLog: { lat, lng },
        priceMultiplier
      };
      await db.collection('bus_payments').doc(paymentId).set(paymentObj);

      res.json({
        success: true,
        balance: newBalance,
        transaction: txObj
      });
    } catch (err) {
      console.error("Pay QR Error:", err);
      res.status(500).json({ message: "فشل إتمام عملية الدفع الرقمية." });
    }
  });

  // GET Secure Passenger signed-qr with custom HMAC signature & timestamp
  app.get("/api/cards/:id/signed-qr", async (req, res) => {
    try {
      const phone = extractUserPhone(req);
      if (!phone) {
        return res.status(401).json({ message: "غير مصرح بالدخول" });
      }

      const cardId = req.params.id;
      const cardDoc = await db.collection('cards').doc(cardId).get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة غير موجودة" });
      }

      const cardData = cardDoc.data();
      if (cardData.userId !== phone) {
        return res.status(403).json({ message: "غير مصرح لك بالوصول لهذه البطاقة" });
      }

      if (cardData.status !== 'active') {
        return res.status(400).json({ message: "البطاقة مجمدة أو محظورة" });
      }

      const timestamp = Date.now();
      const secret = process.env.JWT_SECRET || 'sham_card_pro_ultra_secure_secret_key_2026';
      const rawData = `${cardId}:${phone}:${timestamp}`;
      const signature = crypto.createHmac('sha256', secret).update(rawData).digest('hex');
      
      const qrPayload = {
        cardId,
        userId: phone,
        timestamp,
        signature
      };

      const qrToken = Buffer.from(JSON.stringify(qrPayload)).toString('base64');
      res.json({ qrToken });
    } catch (err) {
      console.error("Signed QR Generation Error:", err);
      res.status(500).json({ message: "فشل توليد رمز البطاقة الآمن" });
    }
  });

  // POST driver reverse scanning passenger signed-qr
  app.post("/api/trips/pay-signed-qr", async (req, res) => {
    try {
      const { qrToken, busId, tripId, gpsLog, location_status } = req.body;
      if (!qrToken) {
        return res.status(400).json({ message: "رمز البطاقة مفقود" });
      }

      // Decode Base64 token
      let qrPayload;
      try {
        const decoded = Buffer.from(qrToken, 'base64').toString('utf-8');
        qrPayload = JSON.parse(decoded);
      } catch (e) {
        return res.status(400).json({ message: "رمز العبور غير صالح أو تالف" });
      }

      const { cardId, userId, timestamp, signature } = qrPayload;
      if (!cardId || !userId || !timestamp || !signature) {
        return res.status(400).json({ message: "مكونات الرمز مفقودة" });
      }

      // 1. Validate signature
      let isVerified = false;
      if (signature && signature.startsWith("offline_")) {
        const expectedOffline = generateOfflineSignature(cardId, userId, timestamp);
        if (signature === expectedOffline) {
          isVerified = true;
        }
      } else {
        const secret = process.env.JWT_SECRET || 'sham_card_pro_ultra_secure_secret_key_2026';
        const rawData = `${cardId}:${userId}:${timestamp}`;
        const expectedSignature = crypto.createHmac('sha256', secret).update(rawData).digest('hex');
        if (signature === expectedSignature) {
          isVerified = true;
        }
      }

      if (!isVerified) {
        return res.status(403).json({ message: "فشل التحقق الرقمي! الرمز تم التلاعب به" });
      }

      // 2. Validate timestamp (expires after 65 seconds)
      const now = Date.now();
      if (now - timestamp > 65000) {
        return res.status(410).json({ message: "رمز العبور منتهي الصلاحية! يرجى تحديث الرمز" });
      }

      // 3. Fetch active card and process payment
      const cardDoc = await db.collection('cards').doc(cardId).get();
      if (!cardDoc.exists) {
        return res.status(404).json({ message: "البطاقة غير موجودة بالنظام" });
      }

      const cardData = cardDoc.data();
      if (cardData.status !== 'active') {
        return res.status(400).json({ message: "هذه البطاقة غير نشطة (محظورة أو مجمدة)" });
      }

      // Validate bus details
      let ticketPrice = 1000;
      let busName = "باص دمشق السريع";
      let routeCode = "M1";
      let resolvedBusId = busId || "bus_M1";

      if (tripId) {
        const tripDoc = await db.collection('bus_trips').doc(tripId).get();
        if (tripDoc.exists) {
          const tripData = tripDoc.data();
          ticketPrice = Number(tripData?.ticketPrice || 1000);
          busName = tripData?.routeName || "باص دمشق السريع";
          routeCode = tripData?.routeCode || "M1";
          resolvedBusId = tripData?.routeId || busId || "bus_M1";
        } else {
          const busDoc = await db.collection('buses').doc(resolvedBusId).get();
          if (busDoc.exists) {
            const busData = busDoc.data();
            ticketPrice = busData?.ticket_price || 1000;
            busName = busData?.route_name || "باص دمشق السريع";
            routeCode = busData?.route_code || "M1";
          }
        }
      } else {
        const busDoc = await db.collection('buses').doc(resolvedBusId).get();
        if (busDoc.exists) {
          const busData = busDoc.data();
          ticketPrice = busData?.ticket_price || 1000;
          busName = busData?.route_name || "باص دمشق السريع";
          routeCode = busData?.route_code || "M1";
        }
      }

      // Validate sufficient balance
      if (cardData.balance < ticketPrice) {
        return res.status(400).json({ message: `رصيد البطاقة غير كافٍ. الأجرة المطلوبة: ${ticketPrice.toLocaleString()} ل.س` });
      }

      // Deduct balance
      const newBalance = cardData.balance - ticketPrice;
      await db.collection('cards').doc(cardId).update({ balance: newBalance });

      // Create transaction
      const txId = "tx_pay_" + Math.random().toString(36).substr(2, 9);
      const txObj = {
        id: txId,
        userId: userId,
        cardId: cardId,
        cardName: cardData.alias || "بطاقة شام",
        type: "pay",
        title: `تذكرة عبور آمنة QR - ${routeCode}`,
        subtitle: busName,
        amount: -ticketPrice,
        timestamp: now,
        gpsLog,
        location_status
      };
      await db.collection('transactions').doc(txId).set(txObj);

      // Create driver-side log/payment record
      const paymentId = "pm_" + Math.random().toString(36).substr(2, 9);
      const userDoc = await db.collection('users').doc(userId).get();
      const passengerName = userDoc.exists ? (userDoc.data()?.fullName || "راكب بطاقة رقمية") : "راكب بطاقة رقمية";

      const paymentObj = {
        id: paymentId,
        busId: resolvedBusId,
        tripId: tripId || "",
        amount: ticketPrice,
        balanceLeft: newBalance,
        passengerName: passengerName,
        status: "success",
        timestamp: now,
        gpsLog,
        location_status
      };
      await db.collection('bus_payments').doc(paymentId).set(paymentObj);

      res.json({
        success: true,
        balance: newBalance,
        transaction: txObj,
        payment: paymentObj
      });
    } catch (err) {
      console.error("Pay Signed QR Error:", err);
      res.status(500).json({ message: "فشل إتمام عملية الدفع الرقمية بالرمز الآمن." });
    }
  });

  // Get Live Bus Locations with custom slight orbital motion for stunning realism!
  app.get("/api/buses/locations", async (req, res) => {
    try {
      const busesSnap = await db.collection('buses').get();
      const buses: any[] = [];
      
      const timeFactor = (Date.now() / 1000 / 30) % (2 * Math.PI); // moves smoothly over a 30s cycle
      
      busesSnap.forEach(doc => {
        const data = doc.data();
        const baseLat = data.location?.lat || 33.5110;
        const baseLng = data.location?.lng || 36.2750;
        
        // Add tiny realistic movement so buses move live on the dashboard!
        const latOffset = 0.003 * Math.sin(timeFactor + (data.route_code === 'B2' ? 1.5 : 3.0));
        const lngOffset = 0.003 * Math.cos(timeFactor);
        
        buses.push({
          ...data,
          location: {
            lat: baseLat + latOffset,
            lng: baseLng + lngOffset
          }
        });
      });
      
      res.json(buses);
    } catch (err) {
      res.status(500).json({ message: "خطأ في خادم مواقع الحافلات الحية" });
    }
  });

  // Get driver board counts, today revenue, and recent payments (Dynamic & Realtime simulator helper)
  app.get("/api/driver/status", async (req, res) => {
    try {
      const busId = req.query.busId as string || "bus_M1";
      const tripId = req.query.tripId as string || "";
      
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const startOfTodayTimestamp = startOfToday.getTime();

      let paymentsSnap;
      if (tripId) {
        paymentsSnap = await db.collection('bus_payments').where('tripId', '==', tripId).get();
      } else {
        paymentsSnap = await db.collection('bus_payments').where('busId', '==', busId).get();
      }
      
      let totalPassengersToday = 0;
      let totalRevenueToday = 0;
      const recentPayments: any[] = [];

      paymentsSnap.forEach(doc => {
        const payment = doc.data();
        if (payment.timestamp >= startOfTodayTimestamp) {
          if (payment.status !== 'failed') {
            totalPassengersToday += 1;
            totalRevenueToday += Number(payment.amount || 0);
          }
          recentPayments.push(payment);
        }
      });

      // Sort recent payments descending by timestamp
      recentPayments.sort((a, b) => b.timestamp - a.timestamp);

      // Fetch Bus/Trip details
      let routeName = "ميكرو البرامكة - المزة جبل";
      let routeCode = "M1";
      let ticketPrice = 1000;

      if (tripId) {
        const tripDoc = await db.collection('bus_trips').doc(tripId).get();
        if (tripDoc.exists) {
          const tripData = tripDoc.data();
          routeName = tripData?.routeName || routeName;
          routeCode = tripData?.routeCode || routeCode;
          ticketPrice = tripData?.ticketPrice || ticketPrice;
        }
      } else {
        const busDoc = await db.collection('buses').doc(busId).get();
        if (busDoc.exists) {
          const busData = busDoc.data();
          routeName = busData?.route_name || routeName;
          routeCode = busData?.route_code || routeCode;
          ticketPrice = busData?.ticket_price || ticketPrice;
        }
      }

      res.json({
        bus: {
          id: busId,
          routeName,
          routeCode,
          ticketPrice
        },
        totalPassengersToday,
        totalRevenueToday,
        recentPayments: recentPayments.slice(0, 15)
      });
    } catch (err) {
      console.error("Driver status error:", err);
      res.status(500).json({ message: "فشل تحميل بيانات السائق." });
    }
  });

  // Simulate passenger scan for driver simulator testing convenience
  app.post("/api/driver/simulate-scan", async (req, res) => {
    try {
      const { busId, amount, passengerName, tripId, status, errorReason, balanceLeft } = req.body;
      
      const paymentId = "pm_" + Math.random().toString(36).substr(2, 9);
      const paymentObj = {
        id: paymentId,
        busId: busId || "bus_M1",
        tripId: tripId || "",
        amount: Number(amount || 1000),
        balanceLeft: balanceLeft !== undefined ? Number(balanceLeft) : 5000,
        passengerName: passengerName || "راكب محاكى",
        status: status || "success",
        errorReason: errorReason || "",
        timestamp: Date.now()
      };
      
      await db.collection('bus_payments').doc(paymentId).set(paymentObj);
      res.json({ success: true, payment: paymentObj });
    } catch (err) {
      console.error("Simulation error:", err);
      res.status(500).json({ message: "فشل إنشاء دفعة محاكاة." });
    }
  });

  // POST /api/driver/sync-offline-queue
  app.post("/api/driver/sync-offline-queue", async (req, res) => {
    try {
      const { tripId, busId, queue } = req.body;
      if (!Array.isArray(queue) || queue.length === 0) {
        return res.status(400).json({ message: "طابور المزامنة فارغ أو غير صالح" });
      }

      let ticketPrice = 1000;
      let busName = "باص دمشق السريع";
      let routeCode = "M1";
      let resolvedBusId = busId || "bus_M1";

      if (tripId) {
        const tripDoc = await db.collection('bus_trips').doc(tripId).get();
        if (tripDoc.exists) {
          const tripData = tripDoc.data();
          ticketPrice = Number(tripData?.ticketPrice || 1000);
          busName = tripData?.routeName || "باص دمشق السريع";
          routeCode = tripData?.routeCode || "M1";
          resolvedBusId = tripData?.routeId || busId || "bus_M1";
        }
      }

      const results = [];

      for (const item of queue) {
        const { cardId, userId, timestamp, signature, amount } = item;
        if (!cardId || !userId || !timestamp || !signature) {
          results.push({ cardId, success: false, reason: "مكونات العملية مفقودة" });
          continue;
        }

        // 1. Verify Signature
        let isVerified = false;
        if (signature.startsWith("offline_")) {
          const expectedOffline = generateOfflineSignature(cardId, userId, timestamp);
          if (signature === expectedOffline) {
            isVerified = true;
          }
        } else {
          const secret = process.env.JWT_SECRET || 'sham_card_pro_ultra_secure_secret_key_2026';
          const rawData = `${cardId}:${userId}:${timestamp}`;
          const expectedSignature = crypto.createHmac('sha256', secret).update(rawData).digest('hex');
          if (signature === expectedSignature) {
            isVerified = true;
          }
        }

        if (!isVerified) {
          results.push({ cardId, success: false, reason: "فشل التحقق من التوقيع الرقمي" });
          continue;
        }

        // 2. Fetch Card Doc
        const cardDoc = await db.collection('cards').doc(cardId).get();
        if (!cardDoc.exists) {
          results.push({ cardId, success: false, reason: "البطاقة غير موجودة" });
          continue;
        }

        const cardData = cardDoc.data();
        if (cardData && (cardData.status === "blocked" || cardData.status === "suspended")) {
          results.push({ 
            cardId, 
            success: false, 
            reason: cardData.status === "blocked" ? "البطاقة محظورة وملغاة" : "البطاقة موقوفة مؤقتاً" 
          });
          continue;
        }
        const price = amount || ticketPrice;

        if (cardData.balance < price) {
          results.push({ cardId, success: false, reason: "الرصيد غير كافٍ" });
          continue;
        }

        // 3. Deduct & Create Tx
        const newBalance = cardData.balance - price;
        await db.collection('cards').doc(cardId).update({ balance: newBalance });

        const txId = "tx_pay_" + Math.random().toString(36).substr(2, 9);
        const txObj = {
          id: txId,
          userId: userId,
          cardId: cardId,
          cardName: cardData.alias || "بطاقة شام",
          type: "pay",
          title: `مزامنة تذكرة عبور - ${routeCode}`,
          subtitle: busName,
          amount: -price,
          timestamp: timestamp || Date.now()
        };
        await db.collection('transactions').doc(txId).set(txObj);

        const paymentId = "pm_" + Math.random().toString(36).substr(2, 9);
        const userDoc = await db.collection('users').doc(userId).get();
        const passengerName = userDoc.exists ? (userDoc.data()?.fullName || "راكب بطاقة رقمية") : "راكب بطاقة رقمية";

        const paymentObj = {
          id: paymentId,
          busId: resolvedBusId,
          tripId: tripId || "",
          amount: price,
          balanceLeft: newBalance,
          passengerName: passengerName + " (مزامنة دون اتصال)",
          status: "success",
          timestamp: timestamp || Date.now()
        };
        await db.collection('bus_payments').doc(paymentId).set(paymentObj);

        results.push({ cardId, success: true });
      }

      res.json({ success: true, results });
    } catch (err) {
      console.error("Sync offline queue error:", err);
      res.status(500).json({ message: "فشل مزامنة تذاكر العبور دون اتصال" });
    }
  });

  // Search Routes & Stations
  app.get("/api/routes/search", async (req, res) => {
    try {
      const { q } = req.query;
      const queryStr = String(q || "").trim();
      
      const busesSnap = await db.collection('buses').get();
      const routes: any[] = [];
      busesSnap.forEach(doc => {
        const data = doc.data();
        if (!queryStr || data.route_code?.includes(queryStr) || data.route_name?.includes(queryStr)) {
          routes.push(data);
        }
      });
      res.json(routes);
    } catch (err) {
      res.status(500).json({ message: "خطأ في البحث عن الخطوط" });
    }
  });

  // API Route for advice (Gemini integration with fallback)
  app.post("/api/gemini/advice", async (req, res) => {
    try {
      const { query } = req.body;
      const ai = getAI();
      if (!ai) {
        return res.json({ text: `أهلاً عيوني، شام كرت ترحب بك! بس للتوضيح، مفتاح الـ API غير مبرمج حالياً بس رح ساعدك بحب: المسارات والمحافظات شغالة تمام والبطاقة نشطة وجاهزة! شو حابب نسوي هلا؟` });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: query,
        config: {
          systemInstruction: `أنت "شام"، المساعد الذكي لتطبيق "بطاقة الشام".
          قواعدك:
          1. الإجابة باللهجة الشامية البيضاء المحببة.
          2. كن مختصراً جداً (أقل من سطرين).
          3. أنت خبير في كل شوارع وأحياء سوريا (دمشق، حلب، حمص، حماة، اللاذقية، طرطوس، إلخ).`,
        },
      });

      res.json({ text: response.text || "عيوني، ما فهمت عليك. ممكن تعيد؟" });
    } catch (error: any) {
      console.error("Gemini Server Error:", error);
      res.status(500).json({ error: "خطأ بالاتصال بالخادم، جرب كمان شوي عيوني." });
    }
  });

  // API Route for place suggestions (Gemini integration with fallback)
  app.post("/api/gemini/suggest", async (req, res) => {
    try {
      const { query } = req.body;
      if (!query || query.length < 2) {
        return res.json({ suggestions: [] });
      }

      const ai = getAI();
      if (!ai) {
        const allPlaces = [
          'ساحة البرامكة', 'جامعة دمشق', 'شارع الحلبوني', 'ساحة الأمويين', 
          'حي الشعلان', 'أوتستراد المزة', 'باب توما', 'حي المهاجرين', 'ساحة العباسيين'
        ];
        const match = allPlaces.filter(p => p.includes(query) || query.split(' ').some(word => p.includes(word)));
        return res.json({ suggestions: match.slice(0, 5) });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3.5-flash',
        contents: `المستخدم يبحث عن مكان في سوريا: "${query}". اقترح 5 أماكن حقيقية دقيقة (أحياء، شوارع، أو معالم).
        مثال للبحث عن 'برامكة': ساحة البرامكة، جامعة دمشق - البرامكة، شارع الحلبوني، إلخ.
        التنسيق: اسم المكان فقط، مفصول بفاصلة.`,
        config: {
          systemInstruction: "أنت محرك بحث جغرافي سوري ذكي. تعرف كل زقاق وحارة في سوريا.",
        },
      });

      const text = response.text || "";
      const suggestions = text.split(/[،,]/).map(s => s.trim()).filter(s => s.length > 0).slice(0, 5);
      res.json({ suggestions });
    } catch (error: any) {
      console.error("Gemini Suggest Error on Server:", error);
      res.status(500).json({ error: "خطأ بالخادم" });
    }
  });

  // Explicit Front-end Routes
  app.get('/service-worker.js', (req, res) => {
    res.setHeader('Content-Type', 'application/javascript');
    res.sendFile(path.join(process.cwd(), 'service-worker.js'));
  });

  app.get('/admin-login', (req, res) => {
    res.sendFile(path.join(process.cwd(), 'admin-login.html'));
  });

  app.get('/admin', requireAdmin, async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== "production") {
        const html = await vite.transformIndexHtml('/admin.html', fs.readFileSync(path.join(process.cwd(), 'admin.html'), 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } else {
        res.sendFile(path.join(process.cwd(), 'dist/admin/admin.html'));
      }
    } catch (e) {
      next(e);
    }
  });

  app.get('/driver', async (req, res, next) => {
    try {
      if (process.env.NODE_ENV !== "production") {
        const html = await vite.transformIndexHtml('/index.html', fs.readFileSync(path.join(process.cwd(), 'index.html'), 'utf-8'));
        res.status(200).set({ 'Content-Type': 'text/html' }).end(html);
      } else {
        res.sendFile(path.join(process.cwd(), 'dist/index.html'));
      }
    } catch (e) {
      next(e);
    }
  });


  if (process.env.NODE_ENV !== "production") {
    app.use(vite.middlewares);
  } else {
    // Serve static compiled admin assets under secure auth
    app.use('/admin/assets', requireAdmin, express.static(path.join(process.cwd(), 'dist/admin/assets')));
    app.use('/assets', express.static(path.join(process.cwd(), 'dist/admin/assets')));

    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server fully running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
