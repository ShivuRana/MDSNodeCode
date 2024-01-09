const mongoose = require("mongoose");

const chatUserSchema = new mongoose.Schema(
  {
    userid: { type: mongoose.Schema.Types.ObjectId, default: null },
    socket_id: { type: Array, default: [] },
    online: { type: Boolean, default: false },
  },
  { timestamps: true }
);

module.exports = mongoose.model("chat_user", chatUserSchema);
