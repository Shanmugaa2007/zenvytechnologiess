import mongoose from "mongoose";

const InternshipSchema = new mongoose.Schema({
    title:{
        type: mongoose.Schema.Types.String,
        required: true,
    },
    days:{
        type: mongoose.Schema.Types.String,
        required: true
    },
    price:{
        type: mongoose.Schema.Types.Number,
        required:true
    },
    image:{
        type: mongoose.Schema.Types.String,
        required: true
    }
})


export const Internships = mongoose.model("Internships",InternshipSchema);
