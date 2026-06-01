import { Router } from "express";
import { Resend } from "resend";
import Consultation from "../MongoDB Schema/consultation.mjs";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/consultation", async (req, res) => {
  try {
    const {
      name,
      email,
      phone,
      company,
      requirement,
    } = req.body;

    if (!name || !email || !phone || !requirement) {
      return res.status(400).json({
        success: false,
        message: "All required fields are mandatory",
      });
    }

    const consultation = await Consultation.create({
      name,
      email,
      phone,
      company,
      requirement,
    });

    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: [process.env.EMAIL_USER],
      replyTo: email,
      subject: `🚀 New Consultation Request - ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2 style="color:#7c3aed">
            New Consultation Request
          </h2>

          <hr />

          <p><strong>Name:</strong> ${name}</p>

          <p><strong>Email:</strong> ${email}</p>

          <p><strong>Phone:</strong> ${phone}</p>

          <p><strong>Company:</strong> ${
            company || "Not Provided"
          }</p>

          <p><strong>Project Requirement:</strong></p>

          <div style="
            background:#f4f4f4;
            padding:15px;
            border-left:4px solid #7c3aed;
            border-radius:8px;
          ">
            ${requirement}
          </div>

        </div>
      `,
    });

    return res.status(201).json({
      success: true,
      message: "Consultation Request Submitted Successfully",
      data: consultation,
    });

  } catch (error) {
    console.error("CONSULTATION ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
});

export default router;