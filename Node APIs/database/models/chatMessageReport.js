const mongoose = require("mongoose");

const chatMessageReportSchema = new mongoose.Schema({
  chatId: {
    type: mongoose.Schema.Types.ObjectId,
  },
  messageId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "chat",
  },
  type: {
    type: String, //airtable-syncs, chatChannel, userChatGroup
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "airtable-syncs",
  },
});

module.exports = mongoose.model("chat_message_report", chatMessageReportSchema);
