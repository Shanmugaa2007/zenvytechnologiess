import mongoose from 'mongoose';

await mongoose.connect(
  "mongodb+srv://zenvy:zenvy26@cluster0.krjlrpp.mongodb.net/zenvy"
);

await mongoose.connection.db.createCollection("NonStud Registerd Users");

const UserRegistrationSchema = new mongoose.Schema({
     name:{
        type: mongoose.Schema.Types.String,
        required: true
    },
    email:{
        type: mongoose.Schema.Types.String
    },
    password:{
        type: mongoose.Schema.Types.String
    },
    phone: {
        type: mongoose.Schema.Types.String
    },
    profession:{
        type: mongoose.Schema.Types.String
    },
    Organization:{
        type: mongoose.Schema.Types.String
    },
  createdAt: {
    type: Date,
    default: Date.now   
  }
})
   

export const UserRegistration = mongoose.model("NonStud Registerd User",UserRegistrationSchema, "NonStud Registerd Users");

