const mongoose = require("mongoose");

const followRequestSchema = mongoose.Schema(
  {
    requester: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
    },
    status: {
      type: Number,
      enums: [
        1, //'requested',
        2, //'accepted',
        3, //'rejected'
      ],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("followRequest", followRequestSchema);
