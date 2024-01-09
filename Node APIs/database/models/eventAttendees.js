const mongoose = require("mongoose");
const validator = require("validator");

const eventAttendeeSchema = mongoose.Schema(
    {
        title: { type: String },
        photo: { type: String },
        name: { type: String, required: true, trim: true },
        email: { type: String, lowercase: true },
        company: { type: String, },
        phone: { type: String },
        facebook: { type: String },
        linkedin: { type: String },
        profession: { type: String, default: "" },
        auth0Id: { type: String, default: null },
        type: { type: String, default: null },
        event: { type: mongoose.Schema.Types.ObjectId, ref: "event", default: [] },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("eventAttendee", eventAttendeeSchema);