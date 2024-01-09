const mongoose = require("mongoose");

const partnerSchema = mongoose.Schema(
    {
        companyName: { type: String, required: true, },
        companyLogo: { type: String, default: "" },
        darkCompanyLogo: { type: String, default: "" },
        description: { type: String, default: "" },
        contactInfo: {
            contactName: { type: String, default: "" },
            phoneNumber: { type: String, default: "" },
            email: { type: String, default: "" },
            website: { type: String, default: "" },
            facebook: { type: String, default: "" },
            linkedin: { type: String, default: "" },
        },
        isMDSPartner: { type: Boolean, default: false, },
        status: { type: String, default: "draft", enum: ["draft", "paused", "published"] },
        MDSType: { type: String, default: "" },
        partnerType: { type: mongoose.Schema.Types.ObjectId, ref: "partnerBadge", default: null, },
        // partnerType: {
        //     typeId: { type: mongoose.Schema.Types.ObjectId, ref: "partnerBadge", default: null },
        //     name: { type: String, default: "" },
        // },
        category: [{ type: mongoose.Schema.Types.ObjectId, ref: "partner_category" }],
        subcategory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'partner_subcategory' }],
        webBanner: { type: String, default: "", },
        thumbnail: { type: String, default: "", },
        mobileBanner: { type: String, default: "", },
        offerValue: { type: String, default: "", },
        OfferDescription: { type: String, default: "" },
        OfferInstructions: { type: String, default: "" },
        isDelete: { type: Boolean, default: false, },
        featuredPartner: { type: Boolean, default: false },
        featuredPartnerOrder: { type: Number, default: 0 },
        freshDealPartner: { type: Boolean, default: false },
        freshDealPartnerOrder: { type: Number, default: 0 },
        badgeOrder: { type: Number, default: 0 },
        urlToAllPosts: { type: String, default: "" },
        pageView: { type: Number, default: 0 },
        claims: { type: Number, default: 0 },
        rating: { type: String, default: "0" },
        userViews: [{
            userId: { type: mongoose.Schema.Types.ObjectId },
            viewCount: { type: Number, default: 0 },
            lastViewClickDate:{ type: Date, default: null},
            viewData: [{viewDate:  {type: Date}}]
        }],
        userOfferViews: [{
            userId: { type: mongoose.Schema.Types.ObjectId },
            offerCount: { type: Number, default: 0 },
            lastOfferClickDate:{ type: Date, default: null},
            offerViewData: [{viewOfferDate:  {type: Date}}]
        }],
        videoIds: [{
            id: { type: mongoose.Schema.Types.ObjectId , ref: 'contentArchive_video', default: null},
            order: { type: Number, default: 0 },
            status: {type: String, enum: ["hidden", "published"], default: "published"}
        }],
        relatedVideoSortOption: {
            type: String,
            enum: ["latest", "views", "comments", "likes","custom"],
            default: "latest"
        },
        tag: [{ type: mongoose.Schema.Types.ObjectId, ref: 'contentArchive_tag', default: null }],
        shortDescription: { type: String, default: "" },
    },
    { timestamps: true }
);

var autoPopulateChildren = function (next) {
    this.populate("category", "name", { isDelete: false });
    this.populate("subcategory", "name", { isDelete: false });
    this.populate("partnerType", "name badgeColor", { isDelete: false });
    this.populate("tag", "name", { isDelete: false });

    next();
};

partnerSchema
    .pre("find", autoPopulateChildren)
    .pre("findOne", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren)
    .pre("findById", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("partner", partnerSchema);
