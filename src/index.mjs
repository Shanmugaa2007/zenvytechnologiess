//"kunb oqll qgpo nnkh"

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import MongoStore from 'connect-mongo'
import { Service } from "./MongoDB Schema/service.mjs";
import { UserRegistration } from "./MongoDB Schema/userRegistration.mjs";
import { StudentRegistration } from "./MongoDB Schema/StudentRegistration.mjs";
import { Feedback } from "./MongoDB Schema/feedback.mjs";
import { Internships } from "./MongoDB Schema/internship.mjs";
import { hashing, comparepassword } from "./hashpassword/passwordhashing.mjs";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
import { profileImage } from "./MongoDB Schema/profile.mjs";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
dotenv.config();


const app = express();

app.set("trust proxy", 1);


app.use(express.json());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://zenvytechnologies.vercel.app"
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
    cookie: {
      httpOnly: true,
      secure: true,        
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24 
    },
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions"
    })
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.diskStorage({});
const upload = multer({ storage });


passport.use(
  new LocalStrategy(
    { usernameField: "username", passwordField: "password" },
    async (username, password, done) => {
      try {
        let user = await UserRegistration.findOne({ username });
        if (!user) {
          user = await StudentRegistration.findOne({ username });
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

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("Mongo error:", err);
  });




app.get("/services", async (req, res) => {
  try {
    const services = await Service.find();
    res.json(services);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/me", (req, res) => {
  if (req.isAuthenticated()) {
    res.json({ authenticated: true, user: req.user });
  } else {
    console.log(req.user)
    res.json({ authenticated: false });
  }
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

      res.json({
        success: true,
        message: "Login success",
        user,
      });
    });
  })(req, res, next);
});


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


app.get("/logout", (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});




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

app.get('/internships',async (req, res) => {
   try {
    const data = await Internships.find();   
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
})

app.get("/internships/:id", async (req, res) => {
  try {
    const data = await Internships.findById(req.params.id);
    if (!data) return res.status(404).json({ message: "Not found" });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/userprofile", upload.single("image"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "Zenvy/users"
    });

    const profileimage = await profileImage.findOneAndUpdate(
      { name: req.user.name },
      { name: req.user.name, image: result.secure_url },
      { upsert: true, new: true }
    );

    res.status(201).json(profileimage);
  } catch (err) {
    res.status(500).json({ message: "Failed to save Profile Image" });
  }
});

app.get("/userprofile", async (req, res) => {
  try {
    const data = await profileImage.findOne({ name: req.user.name });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch Profile Image" });
  }
});



