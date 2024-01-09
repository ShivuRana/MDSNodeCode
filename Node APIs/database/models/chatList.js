const mongoose = require("mongoose");
const chatListSchema = mongoose.Schema({
  type: {
    type: String, //airtable-syncs, chatChannel, userChatGroup
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "airtable-syncs",
  },
  receiverId: {
    type: mongoose.Schema.Types.ObjectId,
    refPath: "type",
  },
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "airtable-syncs",
  },
  messageType: {
    type: String,
    default: "text",
  },
  name: {
    type: String,
    default: "",
  },
  lastMessage: {
    type: String,
    default: "",
  },
  userTimeStamp: {
    type: Date,
  },
  memberList: {
    type: Array,
    default: [],
  },
  count: {
    type: Number,
    default: 0,
  },
  offlineOnline: {
    type: Boolean,
    default: false,
  },
  profilePic: {
    type: String,
    default: "",
  },
  isMention: {
    type: Boolean,
    default: false,
  },
  taggedUserId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
    },
  ],
  clearChat: {
    type: Boolean,
    default: false,
  },
});
module.exports = mongoose.model("chatList", chatListSchema);
