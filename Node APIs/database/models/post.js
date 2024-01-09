const mongoose = require("mongoose");

const postSchema = mongoose.Schema(
  {
    user_type: {
      type: String,
      enum: ["user", "airtable-syncs", "adminuser"],
      required: true,
    },
    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "user_type",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    thumbnail_images: {
      type: Array,
      default: [],
    },
    medium_images: {
      type: Array,
      default: [],
    },
    images: {
      type: Array,
      default: [],
    },
    videos: {
      type: Array,
      default: [],
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "user_type",
      },
    ],
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "comment",
      },
    ],
    feelingsActivity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "feelingsActivity",
    },
    topics: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "topic",
      },
    ],
    pollChoices: [
      {
        value: String,
        votes: [
          {
            type: mongoose.Schema.Types.ObjectId,
            refPath: "user_type",
          },
        ],
      },
    ],
    pollDuration: {
      type: String,
      default: "",
    },
    pollTotalVotes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "user_type",
      },
    ],
    postStatus: {
      type: String,
      default: "Public",
      enum: ["Public", "Private"],
    },
    tagAFriend: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user",
      },
    ],
    postType: {
      type: String,
      default: "Post",
      required: true,
    },
    makeAnnouncement: {
      type: Boolean,
      default: false,
    },
    hideFromFeed: {
      type: Boolean,
      default: false,
    },
    shared_post: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
    },
    share_count: {
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

var autoPopulateChildren = function (next) {
  this.populate(
    "postedBy",
    "email followers following otherdetail profileImg first_name last_name"
  );
  this.populate("topics", "-__v -createdAt -updatedAt");
  this.populate("feelingsActivity", "-__v -createdAt -updatedAt");
  this.populate(
    "tagAFriend",
    "email followers following otherdetail profileImg first_name last_name"
  );
  this.populate({
    path: "shared_post",
    match: { isDelete: false },
    populate: {
      path: "groupId",
      select: "groupTitle",
    },
  });
  next();
};

postSchema
  .pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren)
  .pre("save", autoPopulateChildren);
module.exports = mongoose.model("post", postSchema);
