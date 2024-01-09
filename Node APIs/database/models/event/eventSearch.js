const mongoose = require("mongoose");

const eventSearchSchema = mongoose.Schema(
    {
        name: { type: String, trim: true, default: "" },
    },
    { timestamps: true }
);

module.exports = mongoose.model("eventSearch", eventSearchSchema);
