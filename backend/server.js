const express = require("express");
const cors = require("cors");
const nodemailer = require("nodemailer");
const dotenv = require("dotenv");
const PDFDocument = require("pdfkit");
const fs = require("fs");

dotenv.config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const app = express();
app.use(cors());
app.use(express.json());

/* ================= MAIL ================= */
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: { rejectUnauthorized: false }
});

/* ================= TRIP MASTER ================= */
const trips = {
  bali: {
    name: "Bali & Gili Islands",
    dates: "14 Mar 2026 – 22 Mar 2026",
    duration: "9 Days",
    itinerary: [
      "Arrival in Bali, welcome dinner & nightlife",
      "Uluwatu Temple & Kecak Dance",
      "Nusa Penida island tour",
      "Transfer to Gili Islands – snorkeling & beach clubs",
      "Leisure day & farewell dinner"
    ]
  },
  paris: {
    name: "Paris",
    dates: "April 2026",
    duration: "8 Days",
    itinerary: [
      "Arrival & Eiffel Tower walk",
      "Louvre Museum & city tour",
      "Montmartre & Sacré-Cœur",
      "Seine River Cruise",
      "Parisian food experience & departure"
    ]
  },
  goa: {
    name: "Goa",
    dates: "March 2026",
    duration: "5 Days",
    itinerary: [
      "Arrival & beach shacks",
      "Water sports & nightlife",
      "Dolphin watching",
      "Mandovi river cruise",
      "Leisure & departure"
    ]
  }
};

/* ================= PDF BUILDER ================= */
function createPDF(tripKey, travellers, totalPrice) {
  const trip = trips[tripKey];
  const file = `./TravelSync_${tripKey}_${Date.now()}.pdf`;

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(file));

  // HEADER
  doc.fontSize(26).text("TravelSync Booking Confirmation", { align: "center" });
  doc.moveDown();
  doc.fontSize(18).text(trip.name, { align: "center" });
  doc.moveDown(1.5);

  // TRIP INFO
  doc.fontSize(14).text(`Dates: ${trip.dates}`);
  doc.text(`Duration: ${trip.duration}`);
  doc.text(`Travellers: ${travellers.length}`);
  doc.moveDown();

  // TRAVELLERS
  doc.fontSize(18).text("Traveller Details");
  doc.moveDown(0.5);

  travellers.forEach((t, i) => {
    doc.fontSize(12).text(
      `${i + 1}. ${t.name} | Age: ${t.age} | ${t.email} | ${t.phone} | Room: ${t.room}`
    );
  });

  doc.moveDown(1.5);

  // ITINERARY
  doc.fontSize(18).text("Detailed Itinerary");
  doc.moveDown(0.5);

  trip.itinerary.forEach((day, i) => {
    doc.fontSize(12).text(`Day ${i + 1}: ${day}`);
  });

  doc.moveDown(1.5);

  // PRICE
  doc.fontSize(18).text("Payment Summary");
  doc.fontSize(14).text(`Total Amount: ₹${totalPrice}`);
  doc.text("GST & taxes as applicable");

  doc.moveDown(2);
  doc.fontSize(12).text(
    "This is a booking request confirmation. Payment & further instructions will be shared by TravelSync.",
    { align: "center" }
  );

  doc.end();
  return file;
}

/* ================= API ================= */
app.post("/book-:trip", async (req, res) => {
  try {
    const { trip } = req.params;
    const { travellers, totalPrice } = req.body;

    const pdfPath = createPDF(trip, travellers, totalPrice);

    await transporter.sendMail({
      from: `"TravelSync" <${process.env.EMAIL_USER}>`,
      to: travellers[0].email,
      subject: `Your ${trips[trip].name} Trip – TravelSync`,
      html: `
        <h2>🎉 Booking Confirmed!</h2>
        <p>Your booking request for <b>${trips[trip].name}</b> has been received.</p>
        <p><b>Dates:</b> ${trips[trip].dates}</p>
        <p><b>Travellers:</b> ${travellers.length}</p>
        <p>Please find your <b>complete itinerary & booking details</b> attached.</p>
        <br>
        <p>We’ll contact you shortly for payment & next steps.</p>
        <br>
        <b>– Team TravelSync ❤️</b>
      `,
      attachments: [{ path: pdfPath }]
    });

    console.log(`📩 Booking Email Sent → ${trips[trip].name}`);
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ success: false });
  }
});

/* ================= START ================= */
app.listen(5000, () =>
  console.log("✅ Backend running on http://localhost:5000")
);
