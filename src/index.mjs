import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import MongoStore from "connect-mongo";
import { Service } from "./MongoDB Schema/service.mjs";
import { UserRegistration } from "./MongoDB Schema/userRegistration.mjs";
import { StudentRegistration } from "./MongoDB Schema/StudentRegistration.mjs";
import { Feedback } from "./MongoDB Schema/feedback.mjs";
import { Internships } from "./MongoDB Schema/internship.mjs";
import { hashing, comparepassword } from "./hashpassword/passwordhashing.mjs";
import session from "express-session";
import passport from "passport";
import SibApiV3Sdk from "sib-api-v3-sdk";
import dotenv from "dotenv";
import multer from "multer";
import { v2 as cloudinary } from "cloudinary";
import Razorpay from "razorpay";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";

dotenv.config();

const app = express();

app.set("trust proxy", 1);

app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://zenvytechnologies.vercel.app"
    ],
    credentials: true
  })
);

const isProd = true;

app.use(
  session({
    name: "zenvy.sid",
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGODB_URI,
      collectionName: "sessions"
    }),
    cookie: {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      maxAge: 1000 * 60 * 60 * 24
    }
  })
);

app.use(passport.initialize());
app.use(passport.session());

app.use(express.urlencoded({ extended: true }));

const PORT = process.env.PORT || 5000;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const storage = multer.diskStorage({});
const upload = multer({ storage });

// passport.use(
//   new LocalStrategy(
//     { usernameField: "username", passwordField: "password" },
//     async (username, password, done) => {
//       try {
//         let user = await UserRegistration.findOne({ username });
//         if (!user) {
//           user = await StudentRegistration.findOne({ username });
//         }
//         if (!user) {
//           return done(null, false, {
//             message: "You Don't have an account Please register!"
//           });
//         }
//         const isMatch = await comparepassword(password, user.password);
//         if (!isMatch) {
//           return done(null, false, { message: "Invalid Password" });
//         }
//         return done(null, user);
//       } catch (err) {
//         return done(err);
//       }
//     }
//   )
// );

// passport.serializeUser((user, done) => {
//   const role = user instanceof StudentRegistration ? "student" : "user";
//   done(null, { id: user._id, role });
// });

// passport.deserializeUser(async (data, done) => {
//   try {
//     let user;
//     if (data.role === "student") {
//       user = await StudentRegistration.findById(data.id);
//     } else {
//       user = await UserRegistration.findById(data.id);
//     }
//     done(null, user);
//   } catch (err) {
//     done(err);
//   }
// });

function isAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  return res.status(401).json({
    success: false,
    message: "Login required"
  });
}

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
  const token = req.cookies.token;

  try {
    if (!token) {
      return res.json({
        authenticated: false,
        user: null
      });
    }

    const decoded = jwt.verify(token, "This is My Secret");

    res.json({
      authenticated: true,
      user: decoded
    });

  } catch (err) {
    return res.json({
      authenticated: false,
      user: null
    });
  }
});

app.post("/login",async(req,res)=>{
  
  const { username,password } = req.body;
  try{
   let user = await UserRegistration.findOne({username});
    if(!user)
      user = await StudentRegistration.findOne({username});
    if(!user)
      return res.status(401).json("User not have an account.please register!")
    let ismatch = await comparepassword(password,user.password)
    if(!ismatch)
      return res.status(401).json("Invalid Password")
    const token = jwt.sign({id:user._id},"This is My Secret",{expiresIn:"24hrs"})
    res.cookie("token", token, {
          httpOnly: true,
          secure: true,
          sameSite: "none"
        });
    res.json({
      success:true,
      message:"Login sucessfull"
    })
  }catch(e){
    res.json({
      success:false,
      message:"Login faild"
    })
  }
})

const loginmiddleware = (req,res,next)=>{

  const token = req.cookies.token;
  try{
    if(!token)
      return res.status(401).json("User Not Logged in");
    const decode = jwt.verify(token,"This is My Secret");
    req.user = decode;
    next();
  }
  catch(e){
    return res.status(401).json("Invalid Token")
  }
}

app.get("/profile",loginmiddleware,async(req,res)=>{

  try{
    const user = await StudentRegistration.findById(req.user.id)
    if(!user)
     return user = await UserRegistration.findById(req.user.id)
    if(!user)
      return res.status(401).json("Unauthorized User")
    res.json(user)
  }
  catch(e){
    res.json(e.message)
  }
})


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

app.post("/logout", (req, res) => {

  res.clearCookie("token");
  res.json("User Logout");
});

app.post("/mail", async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({
        success: false,
        message: "All fields are required"
      });
    }
    const client = SibApiV3Sdk.ApiClient.instance;
    client.authentications["api-key"].apiKey = process.env.BREVO_API_KEY;
    const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();
    const sendSmtpEmail = {
      sender: {
        name: "Zenvy Technologies",
        email: process.env.EMAIL_USER
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
      `
    };
    await apiInstance.sendTransacEmail(sendSmtpEmail);
    res.status(200).json({
      success: true,
      message: "Mail sent successfully"
    });
  } catch (err) {
    console.error("BREVO MAIL ERROR FULL:", err);
    res.status(500).json({
      success: false,
      message: "Mail sending failed",
      error: err.message
    });
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
    console.error("Feedback POST Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

app.get("/feedback", async (req, res) => {
  try {
    const feedbacks = await Feedback.find().sort({ _id: -1 });
    res.json(feedbacks);
  } catch (err) {
    console.error("Feedback GET Error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET
});

app.post("/create-order", isAuthenticated, async (req, res) => {
  try {
    const { amount } = req.body;
    const options = {
      amount: amount * 100,
      currency: "INR",
      receipt: "receipt_" + Date.now()
    };
    const order = await razorpay.orders.create(options);
    res.json(order);
  } catch (error) {
    res.status(500).json({
      message: "Order creation failed"
    });
  }
});

app.post("/verify-payment", isAuthenticated, async (req, res) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    internshipId
  } = req.body;

  const body = razorpay_order_id + "|" + razorpay_payment_id;

  const expectedSignature = crypto
    .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
    .update(body.toString())
    .digest("hex");

  if (expectedSignature === razorpay_signature) {
    await StudentRegistration.findByIdAndUpdate(
      req.user._id,
      {
        $addToSet: { purchasedInternships: internshipId }
      }
    );

    res.json({
      success: true,
      message: "Payment verified"
    });
  } else {
    res.status(400).json({
      success: false,
      message: "Invalid signature"
    });
  }
});

app.get("/my-internships", isAuthenticated, async (req, res) => {
  const student = await StudentRegistration
    .findById(req.user._id)
    .populate("purchasedInternships");

  res.json({
    success: true,
    internships: student?.purchasedInternships || []
  });
});

app.get("/has-purchased/:internshipId", isAuthenticated, async (req, res) => {
  const { internshipId } = req.params;

  const student = await StudentRegistration.findById(req.user._id).select("purchasedInternships");

  const purchased = (student?.purchasedInternships || []).some(
    (id) => id.toString() === internshipId
  );

  res.json({
    success: true,
    purchased
  });
});
