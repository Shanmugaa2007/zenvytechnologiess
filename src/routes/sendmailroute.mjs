import { Router } from "express";
import { Resend } from "resend";
import dotenv from "dotenv";

dotenv.config();

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);

router.post("/mail", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const data = await resend.emails.send({
      from: "onboarding@resend.dev", // testing sender
      to: [process.env.EMAIL_USER],
      replyTo: email,
      subject: `New Contact Form Submission - ${name}`,
      html: `
        <div style="font-family:Arial,sans-serif;padding:20px">
          <h2 style="color:#7c3aed">
            New Contact Form Submission
          </h2>

          <p><strong>Name:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>

          <p><strong>Message:</strong></p>

          <div style="
            background:#f4f4f4;
            padding:15px;
            border-left:4px solid #7c3aed;
            border-radius:8px;
          ">
            ${message}
          </div>
        </div>
      `,
    });

    console.log("Mail Sent:", data);

    return res.status(200).json({
      success: true,
      message: "Mail sent successfully",
    });

  } catch (error) {
    console.error("RESEND ERROR:", error);

    return res.status(500).json({
      success: false,
      message: "Mail sending failed",
      error: error.message,
    });
  }
});

export default router;
