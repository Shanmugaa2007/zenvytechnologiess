import mongoose from "mongoose";

const ProfileImageSchema = new mongoose.Schema({
  name: {
    type: String,
  },
  image: {
    type: String,
  }
});

export const profileImage = mongoose.model("UserProfileImage", ProfileImageSchema);
