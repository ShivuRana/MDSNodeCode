const User = require("../../database/models/airTableSync");
const partnerBanner = require("../../database/models/partner/partnerBanner");
const ObjectId = require("mongoose").Types.ObjectId;
const { deleteImage } = require("../../utils/mediaUpload");
const AWS = require("aws-sdk");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});


// create partner banner setting
exports.createPartnerBanner = async (req, res) => {
    try {
        const body = req.body;
        const BannerData = new partnerBanner({
            imageWeb: req.imageWeb,
            imageMobile: req.imageMobile,
            bannerTitle: body.bannerTitle,
            bannerDescription: body.bannerDescription,
            bannerButton: body.bannerButton,
            freshDealTitle: body.freshDealTitle,
            featurePartner: body.featurePartner,
            freshDealSubTitle: body.freshDealSubTitle,
            featurePartnerSubTitle: body.featurePartnerSubTitle,
        });
        const resBanner = await BannerData.save();
        return res.status(200).json({ status: true, message: `Partner banner saved successfully!`, bannerData: resBanner });
    } catch (error) {
        return res.status(500).json({ status: false, message: `Internal server error. ${error}` });
    }
};

// update partner banner setting
exports.updatePartnerBanner = async (req, res) => {
    try {
        const body = req.body;
        const bannerData = await partnerBanner.findOne({ _id: ObjectId(req.params.id), isDelete: false });
        if (!bannerData) {
            return res.status(401).json({ status: false, message: `Partner banner not found!` });
        }
        if (req.imageWeb && bannerData !== null) {
            if (bannerData.imageWeb !== null && bannerData.imageWeb !== "")
                deleteImage(bannerData.imageWeb);
        }
        if (req.imageMobile && bannerData !== null) {
            if (bannerData.imageMobile !== null && bannerData.imageMobile !== "")
            deleteImage(bannerData.imageMobile);
        }
        const bannerDetails = {
            imageWeb: req.imageWeb ?? bannerData.imageWeb,
            imageMobile: req.imageMobile ?? bannerData.imageMobile,
            bannerTitle: body.bannerTitle ?? bannerData.bannerTitle,
            bannerDescription: body.bannerDescription ?? bannerData.bannerDescription,
            bannerButton: body.bannerButton ?? bannerData.bannerButton,
            freshDealTitle: body.freshDealTitle ?? bannerData.freshDealTitle,
            featurePartner: body.featurePartner ?? bannerData.featurePartner,
            freshDealSubTitle: body.freshDealSubTitle ?? bannerData.freshDealSubTitle,
            featurePartnerSubTitle: body.featurePartnerSubTitle ?? bannerData.featurePartnerSubTitle,
        }

        await partnerBanner.findByIdAndUpdate(ObjectId(req.params.id), bannerDetails, { new: true });
        return res.status(200).json({ status: true, message: ` Partner settings successfully updated.` });

    } catch (error) {
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// get partner banner setting
exports.getPartnerBanner = async (req, res) => {
    try {
        const allPartnerBanner = await partnerBanner.find({ isDelete: false });
        if (allPartnerBanner)
            return res.status(200).json({ status: true, message: "All partner banners are retrieved!", data: allPartnerBanner, });
        else
            return res.status(200).json({ status: false, message: "Something went wrong while getting all partner banners!", });
    } catch (e) {
        return res.status(500).json({ status: false, message: "Something went wrong!", error: e });
    }
};

// get partner banner setting API for user
exports.getPartnerBannerByUser = async (req, res) => {
    try {
        const PartnerBannerByUser = await partnerBanner.find({ isDelete: false });
        if (PartnerBannerByUser)
            return res.status(200).json({ status: true, message: "Partner banner detail retrieve successfully.", data: PartnerBannerByUser });
        else
            return res.status(200).json({ status: false, message: "No data found for this partner banner!" });
    } catch (error) {
        console.log(error, "error")
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};