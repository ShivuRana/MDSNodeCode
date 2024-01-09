const mongoose = require("mongoose");

const groupSchema = mongoose.Schema(
  {
    groupTitle: {
      type: String,
      required: true,
    },
    groupInfo: {
      type: String,
      required: true,
      maxLength: 150,
    },
    groupImage: {
      type: String,
      default: null,
    },
    groupCoverImage: {
      type: String,
      default: null,
    },
    groupPostedBy: {
      type: String,
      enum: ["All", "Admin only"],
      default: "All",
      required: true,
    },
    maximumGrpMember: {
      type: Number,
      default: 0,
      required: true,
    },
    createGroupChat: {
      type: String,
      enum: ["Yes", "Delete", "Hide"],
      default: "Yes",
      required: true,
    },
    messageSendBy: {
      type: String,
      enum: ["All", "Admin only"],
      default: "All",
      required: true,
    },
    groupType: {
      type: String,
      enum: ["Public", "Private"],
      default: "Public",
      required: true,
    },
    groupVisibility: {
      type: String,
      enum: ["Anyone", "Admin only"],
      default: "Anyone",
      required: true,
    },
    totalGrpMember: {
      type: Number,
      default: 0,
    },
    totalGrpPosts: {
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

module.exports = mongoose.model("group", groupSchema);
