import mongoose from "mongoose";

const serviceSchema = new mongoose.Schema({
  title: {
    type:mongoose.Schema.Types.String,
    required:true
  },
  image: {
    type:mongoose.Schema.Types.String,
    required:true
  },
  desc: [String]
});

export const Service = mongoose.model("Service", serviceSchema); 
