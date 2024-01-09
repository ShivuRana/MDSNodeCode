const mongoose = require("mongoose");

const searchSchema = mongoose.Schema(
    {
        name: { type: String, trim: true, },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'airtable-syncs' },
    },
    { timestamps: true }
);

module.exports = mongoose.model("contentArchive_search", searchSchema);
