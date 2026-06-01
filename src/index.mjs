import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import { Service } from "./MongoDB Schema/service.mjs";
import { Feedback } from "./MongoDB Schema/feedback.mjs";
import { hashing, comparepassword } from "./hashpassword/passwordhashing.mjs";
import session from "express-session";
import SibApiV3Sdk from "sib-api-v3-sdk";
import nodemailer from "nodemailer";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import ServiceRouter from "./routes/servicerouter.mjs"
import MailRouter from "./routes/sendmailroute.mjs";
import FeedbackRouter from "./routes/feedbackrouter.mjs"
import Consultation from "./routes/consultation.mjs"

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://zenvytechnologies.vercel.app"
    ],
    credentials: true
  })
);


app.use(express.json());
app.use(cookieParser());
app.use(ServiceRouter);
app.use(MailRouter);
app.use(FeedbackRouter);
app.use(Consultation)

const isProd = process.env.NODE_ENV;

app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;


mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    app.listen(PORT, () => {
      console.log(`The Server is running in port ${PORT}`)
    });
    console.log("MongoDB Connected")
  })
  .catch(() => {});
