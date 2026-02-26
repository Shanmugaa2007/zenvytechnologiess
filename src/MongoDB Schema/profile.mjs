<<<<<<< HEAD
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
=======
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
>>>>>>> 9253b974459fd77046e9e3e6de162b3cab70711e
