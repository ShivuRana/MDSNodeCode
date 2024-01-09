const mongoose = require("mongoose");

const contentArchiveCommentSchema = mongoose.Schema(
  {
    user_type: {
      type: String,
      required: true,
      enum: ["user", "airtable-syncs", "adminuser"],
    },
    content: {
      type: String,
      required: true,
    },
    videoId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "contentArchive_video",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "user_type",
      required: true,
    },
    comments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "contentArchiveComment",
      },
    ],
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        refPath: "user_type",
      },
    ],
  },
  { timestamps: true }
);

var autoPopulateChildren = function (next) {
  this.populate(
    "userId",
    "email followers following otherdetail profileImg first_name last_name"
  );
  this.populate("comments");
  next();
};

contentArchiveCommentSchema
  .pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren)
  .pre("save", autoPopulateChildren);
module.exports = mongoose.model(
  "contentArchiveComment",
  contentArchiveCommentSchema
);
