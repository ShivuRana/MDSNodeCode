const mongoose = require("mongoose");

const schema = mongoose.Schema(
  {
    test_file: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("dummy", schema);
