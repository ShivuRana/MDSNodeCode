const mongoose = require("mongoose");

const partnerHelpfulLinksSchema = mongoose.Schema(
    {
        title: { type: String, required: true, },
        url: { type: String, default: "" },
        linkIcon: { type: String, default: "" },
        partnerId : { type: mongoose.Schema.Types.ObjectId , ref: "partner", default: null},
        isDelete:  {type: Boolean, default: false}  
    },
    { timestamps: true }
);

module.exports = mongoose.model("partnerHelpfulLinks", partnerHelpfulLinksSchema);
