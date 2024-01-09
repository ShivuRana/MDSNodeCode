const mongoose = require("mongoose");

const contactUsUserSchema = mongoose.Schema(
    {
        subject: {
            type: String
        },
        email: {
            type: String
        },
        message: {
            type: String
        },
    },
    { timestamps: true }
);

module.exports = mongoose.model("contactUsUser", contactUsUserSchema);
