const mongoose = require("mongoose");
var activitySchema = new mongoose.Schema({
  type: { type: String },
  date: { type: Date, default: Date.now() },
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs" },
  userId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
      default: [],
    },
  ],
  previousGroupName: { type: String, default: "" },
  newGroupName: { type: String, default: "" },
});

// Chat Schema
const chatSchema = mongoose.Schema(
  {
    message: { type: String, default: "" },
    recipient_type: {
      type: String,
      enum: [
        "user",
        "airtable-syncs",
        "adminuser",
        "group",
        "userChatGroup",
        "chatChannel",
      ],
      required: true,
    },
    sender_type: {
      type: String,
      enum: ["user", "airtable-syncs", "adminuser"],
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "recipient_type",
    },
    sender: { type: mongoose.Schema.Types.ObjectId, refPath: "sender_type" },
    type: { type: String, default: "user", required: true },
    isActive: { type: Boolean, default: true },
    media: { type: Array, default: null },
    otherfiles: { type: Array, default: null },
    size: { type: Number }, // stored size in bytes default: 0,
    readmsg: { type: Boolean, default: false },
    group_member: [
      {
        id: { type: mongoose.Schema.Types.ObjectId },
        readmsg: { type: Boolean, default: false },
      },
    ],
    date: { type: String, default: null },
    time: { type: String, default: null },
    quote_message_id: { type: mongoose.Schema.Types.ObjectId, ref: "chat" },
    isBlock: { type: Boolean, default: false },
    isLink: { type: Boolean, default: false },
    edited: { type: Boolean, default: false },
    activity_status: { type: Boolean, default: false },
    activity: { type: activitySchema },
    message_type: { type: String, default: "" },
    video_thumbnail: { type: String, default: "" },
    createdBy: { type: mongoose.Schema.Types.ObjectId, default: null },
    taggedUserId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "airtable-syncs",
        default: [],
      },
    ],
    messageTimeStamp: {
      type: String,
    },
    userTimeStamp: {
      type: Date,
    },
    frontendUniqueId: {
      type: String,
      default: null,
    },
    images: {
      type: Array,
    },
    videos: {
      type: Array, // [{url: video_url, thumbnail: video_thumbnail}]
    },
    documents: {
      type: Array, // [{url: document_url, size: document_size}]
    },
    voiceNotes: {
      type: Array,
    },
    messageReactions: [
      {
        emojiId: String,
        userIds: Array,
      },
    ],
  },
  { timestamps: true }
);

var autoPopulateChildren = function (next) {
  this.populate("quote_message_id");
  this.populate(
    "sender",
    "otherdetail profileImg first_name last_name auth0Id"
  );
  this.populate(
    "recipient",
    "otherdetail profileImg first_name last_name groupTitle groupImage totalGrpMember channelName channelIcon auth0Id"
  );
  this.populate(
    "activity.adminId",
    "otherdetail profileImg first_name last_name auth0Id"
  );
  this.populate(
    "activity.userId",
    "otherdetail profileImg first_name last_name auth0Id"
  );
  this.populate(
    "taggedUserId",
    "auth0Id email otherdetail profileImg thumb_profileImg attendeeDetail.name attendeeDetail.photo auth0Id"
  );
  next();
};
chatSchema.pre("findOneAndUpdate", autoPopulateChildren);
chatSchema.pre("findById", autoPopulateChildren);
chatSchema.pre("findOne", autoPopulateChildren);
chatSchema.pre("find", autoPopulateChildren);
chatSchema.pre("save", autoPopulateChildren);
module.exports = mongoose.model("chat", chatSchema);
