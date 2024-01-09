const mongoose = require("mongoose");

const topicSchema = mongoose.Schema(
  {
    topic: {
      type: String,
      default: "",
      required: true,
    },
    numberOfGroup: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "group",
      },
    ],
    totalPost: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("topic", topicSchema);
