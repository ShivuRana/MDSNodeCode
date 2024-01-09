const mongoose = require("mongoose");

const partnerBannerSchema = mongoose.Schema(
    {
        imageWeb: { type: String, default: "" },
        imageMobile: { type: String, default: "" },
        bannerTitle: { type: String, default: "", },
        bannerDescription: { type: String, default: "" },
        bannerButton: { type:String, default:"Explore Offers"},
        freshDealTitle: { type: String, default: "" },
        featurePartner:{ type: String, default: "" },
        freshDealSubTitle: { type: String, default: "" },
        featurePartnerSubTitle:{ type: String, default: "" },
        isDelete: { type: Boolean, default: false },
    },
    { timestamps: true }
);

module.exports = mongoose.model("partnerBanner", partnerBannerSchema);
