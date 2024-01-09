const mongoose = require("mongoose");

const userChatGroupSchema = mongoose.Schema(
    {
        groupTitle: { type: String, default: "" },
        groupInfo: { type: String, maxLength: 150, default: "" },
        groupImage: { type: String, default: "" },
        created_by: { type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs", default: "" },
        totalGrpMember: { type: Number, default: 0 },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

var autoPopulateChildren = function (next) {
    this.populate(
        "created_by",
        "email otherdetail profileImg"
    );
    next();
};

userChatGroupSchema
    .pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("save", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("userChatGroup", userChatGroupSchema);

