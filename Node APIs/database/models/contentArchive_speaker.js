const mongoose = require("mongoose");
const validator = require("validator");

const speakerSchema = mongoose.Schema(
    {
        name: { type: String, required: true, trim: true, },
        photo: { type: String, },
        company: { type: String, },
        title: { type: String },
        email: { type: String, unique: true, lowercase: true, },
        phone: { type: String },
        facebook: { type: String },
        linkedin: { type: String },
        custom: { type: Object, default: {} },
        designation: { type: String},
        isDelete: { type: Boolean, default: false, },
    },
    { timestamps: true }
);

module.exports = mongoose.model("contentArchive_speaker", speakerSchema);