const mongoose = require("mongoose");

const fieldSchema = mongoose.Schema(
  {
    label: {
      type: String,
      require: true,
    },
    type: {
      type: String,
      require: true,
    },
    placeholder: {
      type: String,
    },
    options: {
      type: Array,
    },
    min: {
      type: Number,
    },
    max: {
      type: Number,
    },
    required: {
      type: String,
    },
    info: {
      type: String,
    },
  },
  { _id: true }
);
//registration form schema
const customregistrationformSchema = mongoose.Schema({
  grid: {
    type: Number,
    required: true,
  },
  fields: {
    type: [fieldSchema],
    required: true,
  },
});

module.exports = mongoose.model(
  "customregistrationform",
  customregistrationformSchema
);
