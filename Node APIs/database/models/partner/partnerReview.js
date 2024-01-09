const mongoose = require("mongoose");

const partnerReviewSchema = mongoose.Schema(
    {
        star: { type: String, default: "0" },
        reviewNote: { type: String, default: "" },
        userId: { type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs", default: null },
        partnerId: { type: mongoose.Schema.Types.ObjectId, ref: "partner", default: null },
        status: { type: String, default: "none", enum: ["none", "approved", "rejected"] },
        reasonId: { type: mongoose.Schema.Types.ObjectId, ref: "partnerReason", default: null },
        rejectNotes: { type: String, default: "" },
        isDelete: { type: Boolean, default: false },
        IsNew: { type: Boolean, default: true },
        reportIds: [ { type: mongoose.Schema.Types.ObjectId, ref: "airtable-syncs", default: null }],
        statusUpdateDate: {type: Date, default: null}
    },
    { timestamps: true }
);

var autoPopulateChildren = function (next) {
    this.populate("partnerId", { companyName: 1, category: 0, subcategory: 0 }, { isDelete: false });
    this.populate("userId", "email otherdetail profileImg attendeeDetail.name attendeeDetail.firstName attendeeDetail.lastName auth0Id", { isDelete: false });
    
    next();
};

partnerReviewSchema
    .pre("find", autoPopulateChildren)
    .pre("findOne", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren)
    .pre("findById", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("partnerReview", partnerReviewSchema);
