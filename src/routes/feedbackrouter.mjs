import { Router } from "express";
import { Feedback } from "../MongoDB Schema/feedback.mjs";

const router = Router();

router.post("/feedback", async (req, res) => {
  try {
    const { name, rating, message } = req.body;
    if (!name || !rating || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }
    const newFeedback = new Feedback({
      name,
      rating,
      message
    });
    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

router.get("/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ _id: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});


export default router;