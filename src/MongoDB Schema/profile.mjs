import mongoose from "mongoose";

await mongoose.connect(
  "mongodb+srv://zenvy:zenvy26@cluster0.krjlrpp.mongodb.net/zenvy"
);

const ProfileImageSchema = new mongoose.Schema({
    image: {
    type: String,
    required: true,
  }
})

export const profileImage = mongoose.model("UserProfileImage",ProfileImageSchema)