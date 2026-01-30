import mongoose from 'mongoose';

await mongoose.connect(
  "mongodb+srv://zenvy:zenvy26@cluster0.krjlrpp.mongodb.net/zenvy"
);


const StudentRegistrationSchema = new mongoose.Schema({
    name:{
        type: mongoose.Schema.Types.String,
        required: true
    },
    username:{
        type: mongoose.Schema.Types.String,
        required: true
    },
    email:{
        type: mongoose.Schema.Types.String,
        required: true,
        unique:true
    },
    password:{
        type: mongoose.Schema.Types.String,
        required: true
    },
    phone: {
        type: mongoose.Schema.Types.String,
        required: true,
    },
    college:{
        type: mongoose.Schema.Types.String,
        required: true,
    },
    course:{
        type: mongoose.Schema.Types.String,
        required: true,
    },
    yearofstudy:{
        type: mongoose.Schema.Types.String,
        required: true
    }

})

export const StudentRegistration = mongoose.model("Stud_Registered_User", StudentRegistrationSchema, "Stud_Registered_Users");
