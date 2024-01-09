let mongoose = require("mongoose");

const planResourcebyGroupSchema = mongoose.Schema(
  {
    group_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
    },
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
      default: null,
    },
    membership_plan_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "membership_plan",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model(
  "plan_resource_bygroup",
  planResourcebyGroupSchema
);
