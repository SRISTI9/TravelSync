const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { v4: uuidv4 } = require("uuid");
const Database = require("better-sqlite3");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = "travelsync_secret";

/* ================= DATABASE ================= */
const db = new Database("travelsync.db");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY,
    creator_id TEXT NOT NULL,
    destination TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    budget TEXT NOT NULL,
    description TEXT,
    image_url TEXT,
    max_seats INTEGER DEFAULT 20,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS bookings (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    trip_name TEXT NOT NULL,
    trip_key TEXT NOT NULL,
    total_price REAL NOT NULL,
    travellers TEXT NOT NULL,
    payment_id TEXT,
    status TEXT DEFAULT 'confirmed',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS trip_members (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS trip_expenses (
    id TEXT PRIMARY KEY,
    trip_id TEXT NOT NULL,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    paid_by TEXT NOT NULL,
    expense_date TEXT NOT NULL,
    split_among TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  );
`);

console.log("✅ Database connected → travelsync.db");

/* ================= OTP STORE ================= */
const otpStore = {};

/* ================= FILE UPLOAD ================= */
const upload = multer({ limits: { fileSize: 2 * 1024 * 1024 } });

/* ================= EMAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
  tls: { rejectUnauthorized: false }
});

/* ================= AUTH MIDDLEWARE ================= */
function requireAuth(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ success: false });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ success: false });
  }
}

/* ================= SEND OTP ================= */
app.post("/auth/send-otp", async (req, res) => {
  const { email } = req.body;
  if (!email) return res.json({ success: false, message: "Email is required" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.json({ success: false, message: "Email already registered" });

  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { otp, expiresAt: Date.now() + 5 * 60 * 1000 };

  try {
    await transporter.sendMail({
      from: `"TravelSync ✈️" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: "Your TravelSync OTP Code",
      html: `
        <div style="font-family:Arial;background:#0b0b0b;padding:40px;border-radius:16px;max-width:400px;margin:auto;">
          <h2 style="color:#f4c430">✈️ TravelSync</h2>
          <p style="color:#fff">Your OTP for registration is:</p>
          <h1 style="color:#f4c430;letter-spacing:10px;font-size:40px">${otp}</h1>
          <p style="color:rgba(255,255,255,0.5);font-size:13px">Expires in 5 minutes. Do not share.</p>
        </div>`
    });
    res.json({ success: true, message: "OTP sent!" });
  } catch (err) {
    console.error(err);
    res.json({ success: false, message: "Failed to send OTP." });
  }
});

/* ================= VERIFY OTP ================= */
app.post("/auth/verify-otp", (req, res) => {
  const { email, otp } = req.body;
  const record = otpStore[email];
  if (!record) return res.json({ success: false, message: "No OTP found." });
  if (Date.now() > record.expiresAt) {
    delete otpStore[email];
    return res.json({ success: false, message: "OTP expired." });
  }
  if (record.otp !== otp) return res.json({ success: false, message: "Incorrect OTP." });
  delete otpStore[email];
  res.json({ success: true });
});

/* ================= REGISTER ================= */
app.post("/auth/signup", upload.single("aadhaar"), async (req, res) => {
  const { name, email, password, dob } = req.body;
  if (!name || !email || !password || !dob || !req.file)
    return res.json({ success: false, message: "All fields required" });

  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.json({ success: false, message: "Email already registered" });

  const age = new Date().getFullYear() - new Date(dob).getFullYear();
  if (age < 18) return res.json({ success: false, message: "Must be 18+" });

  const hashed = await bcrypt.hash(password, 10);
  const id = uuidv4();
  db.prepare("INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)").run(id, name, email, hashed);
  res.json({ success: true });
});

/* ================= LOGIN ================= */
app.post("/auth/login", async (req, res) => {
  const { email, password } = req.body;
  const user = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!user) return res.json({ success: false });
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) return res.json({ success: false });
  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: "2h" });
  res.json({ success: true, token, user: { name: user.name } });
});

/* ================= MOCK PAYMENT ================= */
app.post("/payment/create-order", requireAuth, (req, res) => {
  const { amount, trip } = req.body;
  const orderId = "order_" + uuidv4().replace(/-/g, "").substring(0, 16);
  res.json({ success: true, orderId, amount, currency: "INR", key: "rzp_test_mock" });
});

app.post("/payment/verify", requireAuth, (req, res) => {
  const paymentId = "pay_mock_" + Date.now();
  res.json({ success: true, paymentId });
});

/* ================= BOOKING ================= */
app.post("/booking/confirm", requireAuth, async (req, res) => {
  try {
    const { tripName, tripKey, travellers, totalPrice, paymentId, itinerary } = req.body;
    if (!tripName || !travellers || travellers.length === 0)
      return res.status(400).json({ success: false });

    const bookingId = uuidv4();
    const bookingDate = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

    db.prepare(`
      INSERT INTO bookings (id, user_id, trip_name, trip_key, total_price, travellers, payment_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(bookingId, req.user.id, tripName, tripKey, totalPrice, JSON.stringify(travellers), paymentId);

    /* ─── BUILD PDF ─────────────────────────────────────────── */
    const doc = new PDFDocument({ margin: 50, size: "A4" });
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      /* ─── BUILD BEAUTIFUL HTML EMAIL ────────────────────────── */
      const travellersRows = travellers.map((t, i) => `
        <tr style="border-bottom:1px solid #222;">
          <td style="padding:12px 16px;color:#aaa;font-size:13px">${i + 1}</td>
          <td style="padding:12px 16px;color:#fff;font-size:14px;font-weight:600">${t.name}</td>
          <td style="padding:12px 16px;color:#aaa;font-size:13px">${t.email}</td>
          <td style="padding:12px 16px;color:#aaa;font-size:13px">${t.phone || "—"}</td>
        </tr>`).join("");

      const itineraryItems = (itinerary || []).map((item, i) => `
        <div style="display:flex;align-items:flex-start;gap:14px;margin-bottom:14px">
          <div style="min-width:28px;height:28px;background:#f4c430;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:12px;color:#000">${i + 1}</div>
          <div style="padding-top:4px;color:#ddd;font-size:14px">${item}</div>
        </div>`).join("");

      const emailHtml = `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#0a0a0a;font-family:'Segoe UI',Arial,sans-serif">

  <!-- HEADER BANNER -->
  <div style="background:linear-gradient(135deg,#1a1400 0%,#2a1f00 50%,#1a1400 100%);padding:48px 40px;text-align:center;border-bottom:2px solid #f4c430">
    <div style="font-size:48px;margin-bottom:12px">✈️</div>
    <h1 style="margin:0;font-size:32px;color:#f4c430;letter-spacing:2px;font-family:Georgia,serif">TravelSync</h1>
    <p style="margin:8px 0 0;color:rgba(255,255,255,0.5);font-size:14px;letter-spacing:3px;text-transform:uppercase">Booking Confirmed</p>
  </div>

  <!-- MAIN CONTENT -->
  <div style="max-width:600px;margin:0 auto;padding:40px 24px">

    <!-- SUCCESS BADGE -->
    <div style="text-align:center;margin-bottom:32px">
      <div style="display:inline-block;background:rgba(34,197,94,0.1);border:1px solid rgba(34,197,94,0.3);border-radius:50px;padding:10px 24px">
        <span style="color:#4ade80;font-size:15px;font-weight:700">✅ &nbsp;Your booking is confirmed!</span>
      </div>
    </div>

    <!-- GREETING -->
    <p style="color:#fff;font-size:18px;margin-bottom:8px">Hey <b style="color:#f4c430">${travellers[0].name}</b> 👋</p>
    <p style="color:rgba(255,255,255,0.6);font-size:14px;line-height:1.7;margin-bottom:32px">
      Get ready for an unforgettable journey! Your trip to <b style="color:#fff">${tripName}</b> has been successfully booked.
      Your tickets and itinerary are attached below.
    </p>

    <!-- BOOKING DETAILS CARD -->
    <div style="background:#111;border:1px solid rgba(244,196,48,0.2);border-radius:20px;padding:28px;margin-bottom:28px">
      <h2 style="margin:0 0 20px;color:#f4c430;font-size:18px;font-family:Georgia,serif">📋 Booking Details</h2>

      <table style="width:100%;border-collapse:collapse">
        <tr>
          <td style="padding:10px 0;color:rgba(255,255,255,0.5);font-size:13px;width:40%">🗺️ &nbsp;Trip</td>
          <td style="padding:10px 0;color:#fff;font-size:14px;font-weight:700">${tripName}</td>
        </tr>
        <tr style="border-top:1px solid #1e1e1e">
          <td style="padding:10px 0;color:rgba(255,255,255,0.5);font-size:13px">📅 &nbsp;Booked On</td>
          <td style="padding:10px 0;color:#fff;font-size:14px">${bookingDate}</td>
        </tr>
        <tr style="border-top:1px solid #1e1e1e">
          <td style="padding:10px 0;color:rgba(255,255,255,0.5);font-size:13px">👥 &nbsp;Travellers</td>
          <td style="padding:10px 0;color:#fff;font-size:14px">${travellers.length} person${travellers.length > 1 ? "s" : ""}</td>
        </tr>
        <tr style="border-top:1px solid #1e1e1e">
          <td style="padding:10px 0;color:rgba(255,255,255,0.5);font-size:13px">💳 &nbsp;Payment ID</td>
          <td style="padding:10px 0;color:#f4c430;font-size:13px;font-family:monospace">${paymentId}</td>
        </tr>
        <tr style="border-top:1px solid #1e1e1e">
          <td style="padding:10px 0;color:rgba(255,255,255,0.5);font-size:13px">🎫 &nbsp;Booking ID</td>
          <td style="padding:10px 0;color:#f4c430;font-size:13px;font-family:monospace">${bookingId}</td>
        </tr>
      </table>

      <!-- TOTAL PRICE HIGHLIGHT -->
      <div style="margin-top:20px;background:rgba(244,196,48,0.08);border:1px solid rgba(244,196,48,0.2);border-radius:14px;padding:16px 20px;display:flex;justify-content:space-between;align-items:center">
        <span style="color:rgba(255,255,255,0.6);font-size:13px;text-transform:uppercase;letter-spacing:1px">Total Amount Paid</span>
        <span style="color:#f4c430;font-size:24px;font-weight:800">₹${Number(totalPrice).toLocaleString("en-IN")}</span>
      </div>
    </div>

    <!-- TRAVELLERS TABLE -->
    <div style="background:#111;border:1px solid rgba(255,255,255,0.06);border-radius:20px;overflow:hidden;margin-bottom:28px">
      <div style="padding:20px 24px;border-bottom:1px solid #1e1e1e">
        <h2 style="margin:0;color:#fff;font-size:16px">👥 Traveller Details</h2>
      </div>
      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#0a0a0a">
            <th style="padding:10px 16px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">#</th>
            <th style="padding:10px 16px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Name</th>
            <th style="padding:10px 16px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Email</th>
            <th style="padding:10px 16px;text-align:left;color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px">Phone</th>
          </tr>
        </thead>
        <tbody>${travellersRows}</tbody>
      </table>
    </div>

    <!-- ITINERARY -->
    ${itinerary && itinerary.length > 0 ? `
    <div style="background:#111;border:1px solid rgba(244,196,48,0.15);border-radius:20px;padding:28px;margin-bottom:28px">
      <h2 style="margin:0 0 20px;color:#f4c430;font-size:18px;font-family:Georgia,serif">🗓️ Your Itinerary</h2>
      ${itineraryItems}
    </div>` : ""}

    <!-- CANCELLATION WARNING -->
    <div style="background:rgba(255,100,100,0.06);border:1px solid rgba(255,100,100,0.2);border-radius:14px;padding:16px 20px;margin-bottom:28px">
      <p style="margin:0;color:#f87171;font-size:13px;line-height:1.6">
        ⚠️ <b>No Cancellation Policy:</b> As per our Terms & Conditions, this booking is final and non-refundable. 
        Please ensure all traveller details are correct.
      </p>
    </div>

    <!-- FOOTER -->
    <div style="text-align:center;padding-top:20px;border-top:1px solid #1a1a1a">
      <p style="color:#f4c430;font-size:18px;font-family:Georgia,serif;margin-bottom:8px">✈️ TravelSync</p>
      <p style="color:rgba(255,255,255,0.3);font-size:12px;line-height:1.6">
        Your Booking PDF is attached to this email.<br>
        For support, contact us at ${process.env.EMAIL_USER}
      </p>
    </div>

  </div>
</body>
</html>`;

      await transporter.sendMail({
        from: `"TravelSync ✈️" <${process.env.EMAIL_USER}>`,
        to: travellers.map(t => t.email).join(","),
        subject: `✈️ Booking Confirmed – ${tripName} | TravelSync`,
        html: emailHtml,
        attachments: [{ filename: "Booking.pdf", content: pdfBuffer }]
      });

      res.json({ success: true, bookingId });
    });

    /* ─── GENERATE PDF ──────────────────────────────────────── */
    // Header bar
    doc.rect(0, 0, doc.page.width, 8).fill("#f4c430");

    // Title
    doc.moveDown(0.5);
    doc.font("Helvetica-Bold").fontSize(26).fillColor("#f4c430").text("✈  TravelSync", { align: "center" });
    doc.font("Helvetica").fontSize(12).fillColor("#888").text("BOOKING CONFIRMATION", { align: "center", characterSpacing: 3 });
    doc.moveDown(0.5);

    // Divider
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#f4c430").lineWidth(1).stroke();
    doc.moveDown(1);

    // Booking info
    doc.font("Helvetica-Bold").fontSize(20).fillColor("#ffffff").text(tripName, { align: "center" });
    doc.moveDown(0.4);

    // Info grid
    const infoY = doc.y;
    const col1 = 50, col2 = 320;

    const drawInfo = (label, value, x, y) => {
      doc.font("Helvetica").fontSize(10).fillColor("#888").text(label, x, y);
      doc.font("Helvetica-Bold").fontSize(12).fillColor("#fff").text(value, x, y + 14);
    };

    drawInfo("BOOKING ID", bookingId.substring(0, 18) + "...", col1, infoY);
    drawInfo("PAYMENT ID", paymentId, col2, infoY);
    doc.moveDown(3.5);

    drawInfo("BOOKING DATE", bookingDate, col1, doc.y);
    drawInfo("TOTAL PAID", `Rs. ${Number(totalPrice).toLocaleString("en-IN")}`, col2, doc.y);
    doc.moveDown(3.5);

    drawInfo("TRAVELLERS", `${travellers.length} person${travellers.length > 1 ? "s" : ""}`, col1, doc.y);
    drawInfo("STATUS", "CONFIRMED ✓", col2, doc.y);
    doc.moveDown(2);

    // Divider
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#333").lineWidth(0.5).stroke();
    doc.moveDown(1);

    // Travellers section
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#f4c430").text("TRAVELLER DETAILS");
    doc.moveDown(0.5);

    travellers.forEach((t, i) => {
      const rowY = doc.y;
      // Avatar circle
      doc.circle(65, rowY + 14, 12).fill("#f4c430");
      doc.font("Helvetica-Bold").fontSize(11).fillColor("#000").text(`${i + 1}`, 61, rowY + 9);
      doc.font("Helvetica-Bold").fontSize(13).fillColor("#fff").text(t.name, 85, rowY + 2);
      doc.font("Helvetica").fontSize(11).fillColor("#888").text(`${t.email}   |   ${t.phone || "—"}`, 85, rowY + 17);
      doc.moveDown(2.2);
    });

    // Itinerary section
    if (itinerary && itinerary.length > 0) {
      doc.moveDown(0.5);
      doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#333").lineWidth(0.5).stroke();
      doc.moveDown(1);

      doc.font("Helvetica-Bold").fontSize(14).fillColor("#f4c430").text("TRIP ITINERARY");
      doc.moveDown(0.5);

      itinerary.forEach((item, i) => {
        const itemY = doc.y;
        doc.circle(65, itemY + 8, 9).fill("#1a1a1a").stroke("#f4c430");
        doc.font("Helvetica-Bold").fontSize(10).fillColor("#f4c430").text(`${i + 1}`, 62, itemY + 4);
        doc.font("Helvetica").fontSize(12).fillColor("#ddd").text(item, 85, itemY);
        doc.moveDown(1.2);
      });
    }

    // Bottom bar
    doc.rect(0, doc.page.height - 40, doc.page.width, 40).fill("#111");
    doc.font("Helvetica").fontSize(10).fillColor("#555")
       .text("Generated by TravelSync · Non-refundable booking · Keep this for your records", 50, doc.page.height - 25, { align: "center" });

    doc.end();

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false });
  }
});

/* ================= GET MY BOOKINGS ================= */
app.get("/bookings/mine", requireAuth, (req, res) => {
  const bookings = db.prepare("SELECT * FROM bookings WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
  const parsed = bookings.map(b => ({ ...b, travellers: JSON.parse(b.travellers) }));
  res.json({ success: true, bookings: parsed });
});

/* ================= CREATE TRIP ================= */
app.post("/trips/create", requireAuth, (req, res) => {
  const { destination, start_date, end_date, budget, description, max_seats } = req.body;
  if (!destination || !start_date || !end_date || !budget)
    return res.json({ success: false, message: "All fields required" });

  const id = uuidv4();
  db.prepare(`
    INSERT INTO trips (id, creator_id, destination, start_date, end_date, budget, description, max_seats)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, destination, start_date, end_date, budget, description || "", max_seats || 20);

  res.json({ success: true, tripId: id });
});

/* ================= GET ALL TRIPS ================= */
app.get("/trips", (req, res) => {
  const trips = db.prepare("SELECT * FROM trips ORDER BY created_at DESC").all();
  res.json({ success: true, trips });
});

/* ================= GET MY CREATED TRIPS ================= */
app.get("/trips/mine", requireAuth, (req, res) => {
  const trips = db.prepare("SELECT * FROM trips WHERE creator_id = ?").all(req.user.id);
  res.json({ success: true, trips });
});

/* ================= ADD MEMBER TO TRIP ================= */
app.post("/trips/:tripId/members", requireAuth, (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.json({ success: false, message: "Name and email required" });
  const id = uuidv4();
  db.prepare("INSERT INTO trip_members (id, trip_id, name, email) VALUES (?, ?, ?, ?)").run(id, req.params.tripId, name, email);
  res.json({ success: true });
});

/* ================= GET MEMBERS ================= */
app.get("/trips/:tripId/members", requireAuth, (req, res) => {
  const members = db.prepare("SELECT * FROM trip_members WHERE trip_id = ?").all(req.params.tripId);
  res.json({ success: true, members });
});

/* ================= ADD EXPENSE ================= */
app.post("/trips/:tripId/expenses", requireAuth, (req, res) => {
  const { title, amount, paid_by, expense_date } = req.body;
  if (!title || !amount || !paid_by || !expense_date)
    return res.json({ success: false, message: "All fields required" });
  const id = uuidv4();
  db.prepare("INSERT INTO trip_expenses (id, trip_id, title, amount, paid_by, expense_date) VALUES (?, ?, ?, ?, ?, ?)").run(id, req.params.tripId, title, amount, paid_by, expense_date);
  res.json({ success: true });
});

/* ================= GET EXPENSES + SPLIT CALCULATION ================= */
app.get("/trips/:tripId/expenses", requireAuth, (req, res) => {
  const expenses = db.prepare("SELECT * FROM trip_expenses WHERE trip_id = ? ORDER BY expense_date").all(req.params.tripId);
  const members = db.prepare("SELECT * FROM trip_members WHERE trip_id = ?").all(req.params.tripId);

  const totalAmount = expenses.reduce((sum, e) => sum + e.amount, 0);
  const perPerson = members.length > 0 ? totalAmount / members.length : 0;

  const paid = {};
  members.forEach(m => paid[m.name] = 0);
  expenses.forEach(e => {
    if (paid[e.paid_by] !== undefined) paid[e.paid_by] += e.amount;
  });

  const settlements = members.map(m => ({
    name: m.name,
    paid: paid[m.name] || 0,
    owes: Math.max(0, perPerson - (paid[m.name] || 0)),
    gets: Math.max(0, (paid[m.name] || 0) - perPerson)
  }));

  res.json({ success: true, expenses, totalAmount, perPerson, settlements });
});

/* ================= DELETE EXPENSE ================= */
app.delete("/trips/:tripId/expenses/:expenseId", requireAuth, (req, res) => {
  db.prepare("DELETE FROM trip_expenses WHERE id = ? AND trip_id = ?").run(req.params.expenseId, req.params.tripId);
  res.json({ success: true });
});

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.json({ status: "✅ TravelSync backend is running!" });
});

/* ================= START ================= */
app.listen(5000, () => console.log("✅ Backend running on http://localhost:5000"));