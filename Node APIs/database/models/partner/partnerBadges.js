const mongoose = require("mongoose");

const partnerBadgesSchema = mongoose.Schema(
    {
        name: { type: String, required: true },
        order: { type: Number, default: 0 },
        badgeColor: { type: String, default: "#000000" },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);


module.exports = mongoose.model("partnerBadge", partnerBadgesSchema);