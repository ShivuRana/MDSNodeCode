const mongoose = require("mongoose");

const partnerPostSchema = mongoose.Schema(
    {
        title: { type: String, required: true },
        url: { type: String, default: "" },
        member : { type: mongoose.Schema.Types.ObjectId , ref: "airtable-syncs", default: null},
        author:{ type: String, default: "" },
        partnerId : { type: mongoose.Schema.Types.ObjectId , ref: "partner", default: null},
        isDelete:  {type: Boolean, default: false}  
    },
    { timestamps: true }
);

var autoPopulateChildren = function (next) {
    this.populate(
        "member", { otherdetail: 1, "Preferred Email": 1 }

    );
    next();
};

partnerPostSchema
    .pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("findById", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("partnerPost", partnerPostSchema);
