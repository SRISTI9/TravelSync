const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const PDFDocument = require("pdfkit");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

/* ================= EMAIL TRANSPORT ================= */

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false
  }
});

/* ================= HEALTH CHECK ================= */

app.get("/", (req, res) => {
  res.send("TravelSync backend running ✅");
});

/* ================= GENERIC BOOKING HANDLER ================= */

async function handleBooking(req, res) {
  try {
    const { trip, travellers, itinerary, totalPrice } = req.body;

    console.log(`📩 New Booking → ${trip} | ${travellers[0].name}`);

    /* ---------- CREATE PDF ---------- */
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));

    doc.on("end", async () => {
      const pdfBuffer = Buffer.concat(buffers);

      /* ---------- SEND EMAIL ---------- */
      await transporter.sendMail({
        from: `"TravelSync ✈️" <${process.env.EMAIL_USER}>`,
        to: travellers.map(t => t.email).join(","),
        subject: `🌍 TravelSync Booking Confirmed – ${trip}`,
        html: `
        <div style="background:#0b0b0b;padding:40px;font-family:Arial,sans-serif">
          <div style="max-width:600px;margin:auto;background:#000;border-radius:16px;overflow:hidden">

            <div style="background:#f4c430;padding:20px;text-align:center">
              <h1 style="margin:0;color:#000">TravelSync</h1>
              <p style="margin:6px 0 0;font-weight:bold">Booking Confirmation</p>
            </div>

            <div style="padding:30px;color:#fff">

              <h2 style="color:#f4c430;margin-top:0">${trip}</h2>

              <p style="opacity:.9">
                Your trip has been successfully booked! 🎉  
                Below are your complete booking details.
              </p>

              <div style="background:#111;padding:15px;border-radius:12px;margin:20px 0">
                <p><b>👥 Travellers:</b> ${travellers.length}</p>
                <p><b>💰 Total Price:</b> ₹${totalPrice}</p>
              </div>

              <h3 style="color:#f4c430">Traveller Details</h3>
              <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-size:14px">
                ${travellers.map((t,i)=>`
                  <tr style="background:#141414">
                    <td>${i+1}</td>
                    <td>${t.name}</td>
                    <td>${t.age}</td>
                    <td>${t.email}</td>
                    <td>${t.phone}</td>
                  </tr>
                `).join("")}
              </table>

              <h3 style="color:#f4c430;margin-top:30px">🗺️ Detailed Itinerary</h3>
              <ul style="padding-left:18px;opacity:.9">
                ${itinerary.map(day=>`<li style="margin-bottom:6px">${day}</li>`).join("")}
              </ul>

              <div style="background:#111;padding:15px;border-radius:12px;margin-top:20px">
                <b>Total Amount:</b> ₹${totalPrice}<br>
                <small style="opacity:.7">GST & taxes as applicable</small>
              </div>

              <p style="margin-top:30px;opacity:.8">
                This is a booking request confirmation.  
                Our team will contact you with further details.
              </p>

              <p style="margin-top:20px">
                ❤️ Thank you for choosing <b>TravelSync</b><br>
                <small style="opacity:.7">Need help? Reply to this email.</small>
              </p>

            </div>
          </div>
        </div>
        `,
        attachments: [
          {
            filename: `${trip.replace(/\s+/g, "_")}_Booking.pdf`,
            content: pdfBuffer
          }
        ]
      });

      console.log("📨 Booking Email Sent →", trip);
      return res.status(200).json({ success: true });
    });

    /* ---------- PDF CONTENT ---------- */
    doc.fontSize(22).text("TravelSync – Booking Confirmation", { align: "center" });
    doc.moveDown();

    doc.fontSize(14).text(`Trip: ${trip}`);
    doc.text(`Total Travellers: ${travellers.length}`);
    doc.text(`Total Price: ₹${totalPrice}`);
    doc.moveDown();

    doc.fontSize(16).text("Traveller Details:");
    doc.moveDown(0.5);

    travellers.forEach((t, i) => {
      doc.fontSize(12).text(
        `${i + 1}. ${t.name} | Age: ${t.age} | ${t.email} | ${t.phone}`
      );
    });

    doc.moveDown();
    doc.fontSize(16).text("Itinerary:");
    doc.moveDown(0.5);

    itinerary.forEach(day => {
      doc.fontSize(12).text(`• ${day}`);
    });

    doc.end();

  } catch (err) {
    console.error("❌ Booking error:", err);
    return res.status(500).json({ success: false });
  }
}

/* ================= ROUTES ================= */

app.post("/book-bali", handleBooking);
app.post("/book-paris", handleBooking);
app.post("/book-goa", handleBooking);

/* ================= START SERVER ================= */

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`✅ Backend running on http://localhost:${PORT}`);
});
