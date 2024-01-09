const mongoose = require("mongoose");

const commentSchema = mongoose.Schema(
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
    postId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "post",
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
        ref: "comment",
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

commentSchema
  .pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren);
module.exports = mongoose.model("comment", commentSchema);
