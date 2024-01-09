const mongoose = require("mongoose");

const starredGroupSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("starred_group", starredGroupSchema);
