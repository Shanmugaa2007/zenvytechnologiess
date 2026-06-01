import mongoose from "mongoose";

const consultationSchema = new mongoose.Schema({

  name:{
    type:mongoose.Schema.Types.String,
    required:true
  },

  email:{
    type:mongoose.Schema.Types.String,
    required:true
  },

  phone:{
    type:mongoose.Schema.Types.String,
    required:true
  },

  company:{
    type:mongoose.Schema.Types.String
  },

  requirement:{
    type:mongoose.Schema.Types.String,
    required:true
  },

},{
  timestamps:true
});

export default mongoose.model(
  "Consultation",
  consultationSchema
);