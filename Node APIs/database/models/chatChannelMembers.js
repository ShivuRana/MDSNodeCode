const mongoose = require("mongoose");

const chatChannelMemberSchema = mongoose.Schema(
    {
        userId: { type: mongoose.Schema.Types.ObjectId, refPath: "user_type" },
        channelId: { type: mongoose.Schema.Types.ObjectId, ref: "chatChannel", default: "" },
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
        "email otherdetail profileImg auth0Id attendeeDetail first_name last_name username email"
    );
    this.populate(
        "channelId",
        "channelName channelIcon"
    );
    next();
};

chatChannelMemberSchema
    .pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("chatChannelMember", chatChannelMemberSchema);
