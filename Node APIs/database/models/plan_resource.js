let mongoose = require("mongoose");

const planResourceSchema = mongoose.Schema(
  {
    group_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "group", },],
    show_all_for_group: { type: Boolean, default: false, },
    show_only_with_access_for_group: { type: Boolean, default: false, },
    forum_ids: { type: Array, default: [], },
    show_all_for_forum: { type: Boolean, default: false, },
    show_only_with_access_for_forum: { type: Boolean, default: false, },
    event_offline: { type: Boolean, default: false, },
    event_online: { type: Boolean, default: false, },
    chat_message_limit: { type: Number, default: 10, },
    following_limit: { type: Number, default: 10, },
    notification: {
      type: String, enum: ["1", "2", "3"], // 1=Email 2=SMS 3=Message
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model("plan_resource", planResourceSchema);
