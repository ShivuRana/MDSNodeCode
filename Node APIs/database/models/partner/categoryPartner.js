const mongoose = require("mongoose");

const categoryPartnerSchema = mongoose.Schema(
    {
        category: { type: mongoose.Schema.Types.ObjectId, ref: "contentArchive_category", unique : true  },
        categoryOrder: { type: Number, default: 0 },
     },
    { timestamps: true }
);

module.exports = mongoose.model("categoryPartner", categoryPartnerSchema);
