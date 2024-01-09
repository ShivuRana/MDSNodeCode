const mongoose = require("mongoose");

const eventTypeSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);


module.exports = mongoose.model("eventtype", eventTypeSchema);