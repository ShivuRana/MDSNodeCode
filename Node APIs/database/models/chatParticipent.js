const mongoose = require("mongoose");

const chatParticipentSchema = new mongoose.Schema(
  {
    userid: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      default: null,
    },
    participent: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      default: null,
    },
    blocked: { type: Boolean, default: false },
    reported: { type: Boolean, default: false },
    star: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("chat_participent", chatParticipentSchema);
