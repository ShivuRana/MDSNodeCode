const mongoose = require("mongoose");

const accessResourceSchema = mongoose.Schema(
    {
        name: { type: String, default: "" },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);


module.exports = mongoose.model("accessResource", accessResourceSchema);