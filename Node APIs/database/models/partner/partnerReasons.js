const mongoose = require("mongoose");

const partnerReasonSchema = mongoose.Schema(
    {
        reason: { type: String, default: "" },
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "partner", default: null },
        isDelete: { type: Boolean, default: false }
    },
    { timestamps: true }
);

module.exports = mongoose.model("partnerReason", partnerReasonSchema);