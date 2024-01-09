const User = require("../../database/models/airTableSync");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const ObjectId = require("mongoose").Types.ObjectId;
const partner = require("../../database/models/partner/partner");
const AWS = require("aws-sdk");
const partnerHelpfulLinks = require("../../database/models/partner/parterHelpfulLinks");
const { deleteImage } = require("../../utils/mediaUpload");
const ogs = require('open-graph-scraper');

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create partner helpfullink
exports.createParnerHelpFulLinks = async (req, res) => {
    try {
        console.log(req.body)
        const url = req.body.url;
        const newHelpfulLinkData = new partnerHelpfulLinks({
            title: req.body.title,
            linkIcon: req.linkIcon ? req.linkIcon : req.body.linkIcon ? req.body.linkIcon  : null ,
            url: req.body.url,
            partnerId: req.body.partnerId ? req.body.partnerId : null
        });
        const saveHelpfulLinks = await newHelpfulLinkData.save();
        if (saveHelpfulLinks)
            return res.status(200).json({ status: true, message: `Partner helpful link created successfully!`, helpfulLinksData: saveHelpfulLinks, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while adding partner halpful link!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// edit partner helpfullink
exports.editParnerHelpFulLinks = async (req, res) => {
    try {
        const partnerHelpfulExist = await partnerHelpfulLinks.findById(req.params.id);
        if (!partnerHelpfulExist)
            return res.status(200).json({ status: false, message: `Helpfullinks not found` });
        if (req.linkIcon) {
            deleteImage(partnerHelpfulExist.linkIcon);
        }
        
        const updatedHelpfulLinks = await partnerHelpfulLinks.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title ?? partnerHelpfulExist.title,
                linkIcon: req.linkIcon ? req.linkIcon : req.body.linkIcon ? req.body.linkIcon  :
                        partnerHelpfulExist.linkIcon,
                url: req.body.url ?? partnerHelpfulExist.url,
            },
            { new: true }
        );
        if (updatedHelpfulLinks)
            return res.status(200).json({ status: true, message: `Helpful link updated successfully!`, HelpfulLinksData: updatedHelpfulLinks, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while updating helpful link!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete partner helpfullink
exports.deletePartnerhelpfulLinks = async (req, res) => {
    try {
        const partnerLinksExist = await partnerHelpfulLinks.findById(req.params.id);
        if (!partnerLinksExist)
            return res.status(200).json({ status: false, message: `Partner helpful link not found` });
        if (partnerLinksExist.linkIcon) deleteImage(partnerLinksExist.linkIcon);
        const deletePartnerLinks = await partnerHelpfulLinks.findByIdAndDelete(req.params.id);
        if (deletePartnerLinks)
            return res.status(200).json({ status: true, message: `Partner helpful link deleted successfully!` });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while deleting partner helpful link!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all partner helpfullink list
exports.getPartnerhelpfulLinksByPartnerId = async (req, res) => {
    try {
        const partnerLinksList = await partnerHelpfulLinks.find({ partnerId: req.params.partnerId, isDelete: false }).sort({ createdAt: -1 });
        if (partnerLinksList)
            return res.status(200).json({ status: true, message: `Partner helpful link list`, partnerLinksList: partnerLinksList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting partner helpful link list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner helpfullink detail api
exports.getPartnerhelpfulLinksById = async (req, res) => {
    try {
        const partnerHelpfulLinkDetail = await partnerHelpfulLinks.findById(req.params.id);
        if (partnerHelpfulLinkDetail)
            return res.status(200).json({ status: true, message: `Partner helpful link detail`, partnerHelpfulLinkDetail: partnerHelpfulLinkDetail });
        else
            return res.status(200).json({ status: false, message: `No data found for this partner helpful link id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};