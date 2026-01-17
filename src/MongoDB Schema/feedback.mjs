import mongoose from 'mongoose';

await mongoose.connect(
  "mongodb+srv://zenvy:zenvy26@cluster0.krjlrpp.mongodb.net/zenvy"
);

const feedbackschema = new mongoose.Schema({
    name:{
        type: mongoose.Schema.Types.String,
        required: true
    },
    rating:{
        type: mongoose.Schema.Types.String,
        required: true
    },
    message:{
        type: mongoose.Schema.Types.String,
        required: true
    }
})

export const Feedback = mongoose.model("feedback", feedbackschema, "feedbacks");