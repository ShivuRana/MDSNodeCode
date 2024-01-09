const mongoose = require("mongoose");

const partnerSearchSchema = mongoose.Schema(
    {
        name: { type: String, trim: true, default: "" },
        type: { type: String, default: "" },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'airtable-syncs' },
    },
    { timestamps: true }
);

module.exports = mongoose.model("partnerSearch", partnerSearchSchema);
