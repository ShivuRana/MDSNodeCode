const mongoose = require("mongoose");
const validator = require("validator");

const config = require("config");
const user_role = config.get("user");

const userSchema = mongoose.Schema(
    {
        email: { type: String },
        secondary_email: {
            type: String,
            lowercase: true,
            validate: async (value) => {
                if (!validator.isEmail(value)) {
                    throw new Error("Invalid Email address");
                }
            },
        },
        facebookLinkedinId: { type: String, required: true, default: "" },
        otherdetail: { type: Object, default: {} },
        auth0Id: { type: String, required: true },
        socialauth0id: { type: String, default: "" },
        profileImg: { type: String, default: "" },
        thumb_profileImg: { type: String, default: "" },
        profileCover: { type: String, default: "" },
        active: { type: Boolean, default: false },
        blocked: { type: Boolean, default: false },
        verified: { type: Boolean, default: false },
        following: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
        followers: [{ type: mongoose.Schema.Types.ObjectId, ref: "user" }],
        savePosts: [{ type: mongoose.Schema.Types.ObjectId, ref: "post", default: [] }],
        saveVideos: [{ type: mongoose.Schema.Types.ObjectId, ref: "contentArchive_video", default: [] }],
        token: { type: String, default: "" },
        provider: { type: String, default: "auth0", required: true, enum: ["auth0", "facebook", "linkedin", "apple"] },
        isSocial: { type: Boolean, required: true, default: false },
        payment_id: { type: mongoose.Schema.Types.ObjectId, ref: "payment" },
        purchased_plan: { type: mongoose.Schema.Types.ObjectId, ref: "membership_plan" },
        accessible_groups: [{ type: mongoose.Schema.Types.ObjectId, ref: "group", default: [] }],
        last_login: { type: Date, default: "" },
        last_activity_log: { type: Date, default: Date.now() },
        isDelete: { type: Boolean, default: false },
        register_status: { type: Boolean, default: false },
        personalDetail_status: { type: Boolean, default: false },
        payment_status: { type: Boolean, default: false },
        QA_status: { type: Boolean, default: false },
        user_role: { type: mongoose.Schema.Types.ObjectId, ref: "userrole", default: user_role.role_id, required: true },
        forgot_ticket: { type: String, default: "" },
        blocked_chat: [{ type: mongoose.Schema.Types.ObjectId, default: [] }],
        blocked_by_who_chat: [{ type: mongoose.Schema.Types.ObjectId, default: [], }],
        clear_chat_data: [{
            id: { type: mongoose.Schema.Types.ObjectId, required: true },
            deleteConversation: { type: Boolean, default: false },
            type: { type: String, default: "" },
            date: { type: Date, default: Date.now }
        }],
        deleted_group_of_user: [{ type: mongoose.Schema.Types.ObjectId, default: [], }],
        star_chat: [{ type: mongoose.Schema.Types.ObjectId, default: [] }],
        latitude: { type: String, default: "0" },
        longitude: { type: String, default: "0" },
        migrate_user_status: { type: Boolean, default: false },
        migrate_user: { type: Object, default: {} },
        userEvents: { type: Object, default: {} },
        video_history_data: [{
            video_id: { type: mongoose.Schema.Types.ObjectId, required: true },
            history_date: { type: Date, default: "" },
        }],
        muteNotification: [{
            chatId: { type: mongoose.Schema.Types.ObjectId, },
            type: { type: String, default: "" },
            mute: { type: Boolean, default: false },
        }],
        deactivate_account_request: { type: Boolean, default: false },
        deviceToken: { type: [{ type: String }], default: [] },
    },
    {
        timestamps: true,
    }
);

const User = mongoose.model("user", userSchema);

module.exports = User;
