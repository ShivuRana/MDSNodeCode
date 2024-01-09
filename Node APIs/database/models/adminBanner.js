const mongoose = require("mongoose");
Schema = mongoose.Schema;

const adminBannerSchema = new mongoose.Schema({
    bannerImage: { type: String, default: "" },
    webBannerImage: { type: String, default: "" },
    bannerUrl: { type: String, default: "" },
    publicationStartDate: { type: String, default: "" },
    publicationStartTime: { type: String, default: "" },
    publicationEndDate: { type: String, default: "" },
    publicationEndTime: { type: String, default: "" },
    saveAs: { type: String, enum: ["draft", "publish"] },
    order: { type: Number, default: 0 },
    isDelete: { type: Boolean, default: false },
}, {
    timestamps: true
});

module.exports = mongoose.model("adminBanner", adminBannerSchema);
