const mongoose = require("mongoose");

const feelingsActivitySchema = mongoose.Schema(
  {
    feeling: {
      type: String,
      default: "",
      required: true,
    },
    emoji: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("feelingsActivity", feelingsActivitySchema);
