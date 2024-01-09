const mongoose = require("mongoose");

const groupMemberSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: "user_type",
      required: true,
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      required: true,
    },
    user_type: {
      type: String,
      default: "airtable-syncs",
      enum: ["user", "airtable-syncs", "adminuser"],
    },
    status: {
      type: Number,
      enums: [
        1, //'send invite',
        2, //'accept invite or join group',
        3, //'reject/cancle/remove invite'
      ],
    },
  },
  {
    timestamps: true,
  }
);
 
var autoPopulateChildren = function (next) {
  this.populate(
    "userId",
    "email followers following otherdetail first_name last_name profileImg latitude longitude"
  );
  next();
};

groupMemberSchema
  .pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren);

module.exports = mongoose.model("groupMember", groupMemberSchema);
