const mongoose = require("mongoose");

const userSocialAccountSchema = mongoose.Schema(
    {
        userId: { type: String, default: null },
        userRequest: { type: Object, default: null },
        userResponse: { type: Object, default: null },
        auth0Request: { type: Object, default: null },
        auth0Response: { type: Object, default: null },
        loginType: { type: String, default: "" },
        isDelete: { type: Boolean, default: false, },
    },
    { timestamps: true }
);

const userSocialAccount = mongoose.model("userSocialAccount", userSocialAccountSchema);

module.exports = userSocialAccount;
