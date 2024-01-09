const mongoose = require("mongoose");
const validator = require("validator");

const config = require("config");
const user_role = config.get("user");

const userEmailSchema = mongoose.Schema(
    {
        email: { type: String },
        otp: { type: String },
        otpExpireTime: { type: Date },
        is_otp_verified: { type: Boolean, default: false },
    }, { timestamps: true }
);

const AuthUserEmail = mongoose.model("auth_user_email", userEmailSchema);

module.exports = AuthUserEmail;
