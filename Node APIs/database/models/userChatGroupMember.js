const mongoose = require("mongoose");

const userChatGroupMemberSchema = mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs", default: "" },
        groupId: { type: mongoose.Schema.Types.ObjectId, ref: "userChatGroup", default: "" },
        user_type: { type: String, enum: ["user", "airtable-syncs", "adminuser"], default: "airtable-syncs" },
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
        "email followers following otherdetail profileImg latitude longitude"
    );
    this.populate(
        "groupId",
        "groupTitle groupInfo groupImage totalGrpMember created_by"
    );
    this.populate(
        "groupId",
        "groupTitle groupInfo groupImage totalGrpMember created_by"
    );
    next();
};

userChatGroupMemberSchema
    .pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("userChatGroupMember", userChatGroupMemberSchema);
