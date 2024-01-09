const mongoose = require("mongoose");

const chatGroupSchema = mongoose.Schema(
  {
    group_name: {
      type: String,
      required: true,
    },
    group_bio: {
      type: String,
      default: "",
    },
    group_image: {
      type: String,
      default: "",
    },
    created_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
      required: true,
    },
    participents: [
      {
        id: { type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs" },
        datetime: { type: Date },
      },
    ],
    isDelete: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

var autoPopulateChildren = function (next) {
  this.populate(
    "created_by",
    "email followers following otherdetail profileImg"
  );
  this.populate(
    "participents.id",
    "email followers following otherdetail profileImg"
  );
  next();
};

chatGroupSchema
  .pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren)
  .pre("save", autoPopulateChildren)
  .pre("findByIdAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("chatgroup", chatGroupSchema);
