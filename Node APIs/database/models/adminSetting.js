const mongoose = require("mongoose");

const groupChatSettingSchema = mongoose.Schema(
    {
        groupMember: {
            type: Number,
            default: 5,
        },
        messagesPerDay: {
            type: Number,
            default: 50,
        }
    },
    { timestamps: true }
);

module.exports = mongoose.model("groupChatSetting", groupChatSettingSchema);
