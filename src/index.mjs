//"kunb oqll qgpo nnkh"


import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";

import { Service } from "./MongoDB Schema/service.mjs";
import { UserRegistration } from "./MongoDB Schema/userRegistration.mjs";
import { StudentRegistration } from "./MongoDB Schema/StudentRegistration.mjs";
import { Feedback } from "./MongoDB Schema/feedback.mjs";
import { Internships } from "./MongoDB Schema/internship.mjs";
import { hashing, comparepassword } from "./hashpassword/passwordhashing.mjs";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://zenvytechnologies.vercel.app",
    ],
    credentials: true,
  })
);

app.use(
  session({
    name: "zenvy.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
    }),
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24,
    },
  })
);

app.use(passport.initialize());
app.use(passport.session());

passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        let user = await UserRegistration.findOne({ username });
        if (!user) user = await StudentRegistration.findOne({ username });

        if (!user) {
          return done(null, false, {
            message: "You Don't have an account Please register!",
          });
        }

        const isMatch = await comparepassword(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid Password" });
        }

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

passport.serializeUser((user, done) => {
  const role = user instanceof StudentRegistration ? "student" : "user";
  done(null, { id: user._id, role });
});

passport.deserializeUser(async (data, done) => {
  try {
    let user;
    if (data.role === "student") {
      user = await StudentRegistration.findById(data.id);
    } else {
      user = await UserRegistration.findById(data.id);
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
});

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(process.env.PORT || 5000, () => {
      console.log("Server running");
    });
  })
  .catch((err) => console.error("Mongo error:", err));

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({});
const upload = multer({ storage });

app.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    return res.json({
      authenticated: true,
      user: req.user,
    });
  }
  return res.json({
    authenticated: false,
    user: null,
  });
});

app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: info?.message || "Login failed",
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      return res.json({
        success: true,
        message: "Login success",
        user,
      });
    });
  })(req, res, next);
});

app.post("/logout", (req, res, next) => {
  req.logout(function (err) {
    if (err) return next(err);

    req.session.destroy((err) => {
      if (err) return next(err);

      res.clearCookie("zenvy.sid");

      return res.json({
        success: true,
      });
    });
  });
});

app.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/otherregister", async (req, res) => {
  try {
    req.body.password = await hashing(req.body.password);
    const registers = new UserRegistration(req.body);
    await registers.save();
    res.json({ message: "User saved successfully" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/studentregister", async (req, res) => {
  try {
    req.body.password = await hashing(req.body.password);
    const student = new StudentRegistration(req.body);
    await student.save();
    res.status(201).json({ message: "Student registered successfully" });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/internships", async (req, res) => {
  try {
    const data = await Internships.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/internships/:id", async (req, res) => {
  try {
    const data = await Internships.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/feedback", async (req, res) => {
  try {
    const { name, rating, message } = req.body;

    if (!name || !rating || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const newFeedback = new Feedback({ name, rating, message });
    await newFeedback.save();
    res.status(201).json(newFeedback);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ _id: -1 });
    res.json(feedbacks);
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/mail", async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey =
      process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    await apiInstance.sendTransacEmail({
      sender: {
        name: "Zenvy Technologies",
        email: process.env.EMAIL_USER,
      },
      to: [{ email: process.env.EMAIL_USER }],
      replyTo: { email, name },
      subject: `New Contact Message from ${name}`,
      htmlContent: `<h3>New Contact Message</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>`,
    });

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false });
  }
});