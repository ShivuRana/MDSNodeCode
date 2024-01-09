const mongoose = require("mongoose");

const questionnaireSchema = mongoose.Schema(
  {
    question: {
      type: String,
      require: true,
    },
    field_type: {
      type: String,
      enum: [
        "text",
        "textarea",
        "checkbox",
        "radio",
        "number",
        "email",
        "time",
        "data",
        "file",
      ],
      default: "text",
    },
    placeholder: {
      type: String,
      default: "",
    },
    require_field: {
      type: Boolean,
      default: false,
    },
    info: {
      type: String,
      default: "",
    },
    minlength: {
      type: Number,
      default: 0,
    },
    maxlength: {
      type: Number,
      default: 100000,
    },
    options: {
      type: Array,
      default: [],
    },
    order: {
      type: Number,
      default: 0,
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("questionnaire", questionnaireSchema);
