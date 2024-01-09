const mongoose = require("mongoose");

const commonImageSchema = mongoose.Schema(
    {
        url: { type: String, default: "" },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

module.exports = mongoose.model("commonImage", commonImageSchema);