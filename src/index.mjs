import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import {Service} from './MongoDB Schema/service.mjs'
import {UserRegistration} from './MongoDB Schema/userRegistration.mjs'
import {StudentRegistration} from './MongoDB Schema/StudentRegistration.mjs'
import { hashing ,comparepassword } from "./hashpassword/passwordhashing.mjs";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GitHubStrategy } from "passport-github2";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as TwitterStrategy } from "passport-twitter";
import nodemailer from "nodemailer";

 

const app = express();
app.use(cors({
  origin:"http://localhost:5173",
  credentials:true
}));
app.use(express.json());
app.use(express.urlencoded({extended:true}))
app.use(session({
  name:"connect.sid",
  secret:"ithu yarukum theriyathu",
  saveUninitialized:false,
  resave:false,
  cookie:{
    maxAge:60000* 60,
    secure:false,
    httpOnly:true,
    sameSite:"lax"
  }
}));

const PORT=5000;

app.use(passport.initialize())
app.use(passport.session());

passport.use(
  new LocalStrategy(
    { usernameField: "email", passwordField: "password" }, 
    async (email, password, done) => {
      console.log("Passport Running")
      try {
        let user=null;
         user = await UserRegistration.findOne({ email: email });
        if (!user) {
          user = await StudentRegistration.findOne({email:email})
        }

        if(!user){
          return done(null,false,{message:"You Don't have an account Please register!"});
        }

        const isMatch = comparepassword(password, user.password); 
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
  done(null,{id:user._id,role:user.college});
});
passport.deserializeUser(async (data, done) => {

  console.log("deserializer")
      console.log(data.role)
   try { 
    let user;
    
    if(data.role!= null){
      console.log(data.role)
      user=await StudentRegistration.findById(data.id);
    }
    else{
      user = await UserRegistration.findById(data.id);
    }
    done(null, user); 
  } catch (err) {
     done(err); 
    } });


    passport.use(new GitHubStrategy({
    clientID: "Ov23li2e9jjP6W7zNGr6",
    clientSecret: "95ab1abfb181c8d07080428c5f283afa08bed559",
    callbackURL: "http://127.0.0.1:5000/auth/github/callback"
  },
  async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await UserRegistration.findOne({
          githubId: profile.id,
          name: profile.displayName || profile.username,
          email: profile.emails?.[0]?.value || null,
          avatar: profile.photos?.[0]?.value
        });

        if (!user) {
          user = await UserRegistration.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value,
            githubId: profile.id,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.use(
  new GoogleStrategy(
    {
      clientID: "1058432680151-ptrn3h0is930j0063k77rlula7q6nu5m.apps.googleusercontent.com",
    clientSecret: "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",
    callbackURL: "http://localhost:5000/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await UserRegistration.findOne({
          googleId: profile.id,
        });

        if (!user) {
          user = await UserRegistration.create({
            name: profile.displayName,
            email: profile.emails[0].value,
            googleId: profile.id,
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);


passport.use(
  new TwitterStrategy(
    {
      consumerKey: "UPWxto0DV3fqsTUYUT3O4BSOV",
      consumerSecret: "WIdueIJwjYh1820OzRkQx1VXcrbzpiui430Ug2Yy4zKVC0xmpr",
      callbackURL: "http://localhost:5000/auth/twitter/callback",
      includeEmail: true
    },
    async (token, tokenSecret, profile, done) => {
      try {
        let user = await UserRegistration.findOne({
          twitterId: profile.id
        });

        if (!user) {
          user = await UserRegistration.create({
            name: profile.displayName,
            email: profile.emails?.[0]?.value || null,
            twitterId: profile.id
          });
        }

        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);



const MONGO_URI =
  "mongodb+srv://zenvy:zenvy26@cluster0.krjlrpp.mongodb.net/zenvy";

mongoose
  .connect(MONGO_URI)
  .then(() => console.log("MongoDB connected (Mongoose)"))
  .catch((err) => console.error(err));



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
    res.json({
      authenticated: true,
      user: req.user
    });
  } else {
    res.json({ authenticated: false });
  }
});





app.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Login failed"
      });
    }

    req.logIn(user, (err) => {
      if (err) return next(err);

      return res.json({
        success: true,
        message: "Login success",
        user: user
      });
    });
  })(req, res, next);
});


app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["user:email"] })
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", {
    failureRedirect: "/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:5173/");
  }
);

app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: "http://localhost:5173/login",
  }),
  (req, res) => {
    res.redirect("http://localhost:5173/");
  }
);


app.get(
  "/auth/twitter",
  passport.authenticate("twitter")
);

app.get(
  "/auth/twitter/callback",
  passport.authenticate("twitter", {
    failureRedirect: "http://localhost:5173/login"
  }),
  (req, res) => {
    res.redirect("http://localhost:5173/");
  }
);




app.post("/otherregister", async (req, res) => {
  try {
    
    req.body.password = hashing(req.body.password);

    const registers = new UserRegistration(req.body);
    await registers.save();

    res.send({ message: "User saved successfully" });
    console.log("successful");
  } catch (e) {
    res.status(400).send(`Error : ${e.message}`);
  }
});


app.post("/studentregister", async (req, res) => {

  console.log(req.body.password)
  try {

    req.body.password = hashing(req.body.password);

    const student = new StudentRegistration(req.body);
    await student.save();

    res.status(201).send("Student registered successfully");
  } catch (e) {
    res.status(400).send(`Error: ${e.message}`);
  }
});

app.get("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({ success: true });
    });
  });
});



app.post("/mail", async (req, res) => {
  const { name, email, message } = req.body; 

  
  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "zenvytechnologies@gmail.com", 
      pass: "kunb oqll qgpo nnkh", 
    },
  });

  let mailOptions = {
    from: "zenvytechnologies@gmail.com",        
    to: "zenvytechnologies@gmail.com",         
    subject: `New message from ${name}`, 
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`, 
    html: `<p><b>Name:</b> ${name}</p>
           <p><b>Email:</b> ${email}</p>
           <p><b>Message:</b> ${message}</p>`, 
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send({ success: true, message: "Email sent successfully" });
  } catch (error) {
    console.log(error);
    res.status(500).send({ success: false, message: "Email sending failed", error });
  }
});


app.listen(PORT, () =>
  console.log("Server running on port 5000")
);

//"kunb oqll qgpo nnkh"