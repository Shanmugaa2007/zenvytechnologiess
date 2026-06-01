import { Router } from "express";
import { Service } from "../MongoDB Schema/service.mjs";

const router = Router();

router.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router