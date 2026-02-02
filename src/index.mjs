import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import SibApiV3Sdk from "sib-api-v3-sdk";

// ✅ Schemas
import { Service } from "./MongoDB Schema/service.mjs";
import { UserRegistration } from "./MongoDB Schema/userRegistration.mjs";
import { StudentRegistration } from "./MongoDB Schema/StudentRegistration.mjs";
import { Feedback } from "./MongoDB Schema/feedback.mjs";
import { Internships } from "./MongoDB Schema/internship.mjs";

// ✅ Password helpers
import { hashing, comparepassword } from "./hashpassword/passwordhashing.mjs";

dotenv.config();

const app = express();

// ✅ If hosting behind Render/NGINX etc.
app.set("trust proxy", 1);

// ✅ Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Environment
const PORT = process.env.PORT || 5000;
const isProd = process.env.NODE_ENV === "production";

// ✅ CORS (credentials + origins)
app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://zenvytechnologies.vercel.app",
    ],
    credentials: true,
  })
);

// ✅ Session store in Mongo
app.use(
  session({
    name: "zenvy.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions",
      ttl: 60 * 60 * 24, // 1 day (seconds)
    }),
    cookie: {
      httpOnly: true,
      secure: isProd, // ✅ HTTPS only in prod
      sameSite: isProd ? "none" : "lax", // ✅ cross-site in prod
      maxAge: 1000 * 60 * 60 * 24, // 1 day
    },
  })
);

// ✅ Passport init (MUST be after session)
app.use(passport.initialize());
app.use(passport.session());

// ✅ Cloudinary (if needed)
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// ✅ Multer
const storage = multer.diskStorage({});
const upload = multer({ storage });

// -----------------------------
// ✅ Passport Local Strategy
// -----------------------------
passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        let user = await UserRegistration.findOne({ username });
        let role = "user";

        if (!user) {
          user = await StudentRegistration.findOne({ username });
          role = "student";
        }

        if (!user) {
          return done(null, false, {
            message: "You Don't have an account Please register!",
          });
        }

        const isMatch = await comparepassword(password, user.password);
        if (!isMatch) {
          return done(null, false, { message: "Invalid Password" });
        }

        // attach role for serialize
        user.__role = role;

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    }
  )
);

// ✅ Serialize only minimal info
passport.serializeUser((user, done) => {
  const role = user.__role || "user";
  done(null, { id: user._id, role });
});

// ✅ Deserialize from DB
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

// -----------------------------
// ✅ Helpers
// -----------------------------
const ensureAuth = (req, res, next) => {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  return res.status(401).json({ success: false, message: "Not logged in" });
};

// -----------------------------
// ✅ Routes
// -----------------------------

app.get("/", (req, res) => {
  res.json({ ok: true });
});

// ✅ Services
app.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ✅ Auth check
app.get("/me", (req, res) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    return res.json({ authenticated: true, user: req.user });
  }
  return res.json({ authenticated: false });
});

// ✅ Login
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

      // ✅ Send minimal user (optional)
      return res.json({
        success: true,
        message: "Login success",
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
        },
      });
    });
  })(req, res, next);
});

// ✅ Logout
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);

    req.session.destroy(() => {
      res.clearCookie("zenvy.sid", {
        httpOnly: true,
        secure: isProd,
        sameSite: isProd ? "none" : "lax",
      });
      res.json({ success: true });
    });
  });
});

// ✅ Current logged user for Dashboard
app.get("/current-user", ensureAuth, (req, res) => {
  const user = req.user;

  res.json({
    success: true,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      fullname: user.name, // your frontend expects fullname
      createdAt: user.createdAt || null,
    },
  });
});

// ✅ Register (other)
app.post("/otherregister", async (req, res) => {
  try {
    req.body.password = await hashing(req.body.password);
    const registers = new UserRegistration(req.body);
    await registers.save();
    res.send({ message: "User saved successfully" });
  } catch (e) {
    res.status(400).send(`Error : ${e.message}`);
  }
});

// ✅ Register (student)
app.post("/studentregister", async (req, res) => {
  try {
    req.body.password = await hashing(req.body.password);
    const student = new StudentRegistration(req.body);
    await student.save();
    res.status(201).send("Student registered successfully");
  } catch (e) {
    res.status(400).send(`Error: ${e.message}`);
  }
});

// ✅ Feedback
app.post("/feedback", async (req, res) => {
  try {
    const feedback = new Feedback(req.body);
    await feedback.save();
    res.status(201).json(feedback);
  } catch {
    res.status(500).json({ message: "Failed to save feedback" });
  }
});

app.get("/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedbacks);
  } catch {
    res.status(500).json({ message: "Failed to fetch feedback" });
  }
});

// ✅ Mail (Brevo)
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
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;

    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

    const sendSmtpEmail = {
      sender: {
        name: "Zenvy Technologies",
        email: process.env.EMAIL_USER,
      },
      to: [{ email: process.env.EMAIL_USER }],
      replyTo: { email, name },
      subject: `New Contact Message from ${name}`,
      htmlContent: `
        <h3>New Contact Message</h3>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b></p>
        <p>${message}</p>
      `,
    };

    await apiInstance.sendTransacEmail(sendSmtpEmail);

    res.status(200).json({
      success: true,
      message: "Mail sent successfully",
    });
  } catch (err) {
    console.error("BREVO MAIL ERROR FULL:", err);

    res.status(500).json({
      success: false,
      message: "Mail sending failed",
      error: err.message,
    });
  }
});

// ✅ Internships
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

// -----------------------------
// ✅ DB connect + Server start
// -----------------------------
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("Mongo error:", err));
