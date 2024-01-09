const mongoose = require("mongoose");

const starredTopicsSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
      required: true,
    },
    topicId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "topic",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("starred_topic", starredTopicsSchema);
