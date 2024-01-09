const User = require("../../database/models/airTableSync");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const ObjectId = require("mongoose").Types.ObjectId;
const partner = require("../../database/models/partner/partner");
const AWS = require("aws-sdk");
const partnerPost = require("../../database/models/partner/partnerPost");
const { deleteImage } = require("../../utils/mediaUpload");
const ogs = require('open-graph-scraper');

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create partner post
exports.createPartnerPost = async (req, res) => {
    try {
        const url = req.body.url;
        const newpostData = new partnerPost({
            title: req.body.title,
            url: req.body.url,
            partnerId: req.body.partnerId ? req.body.partnerId : null,
            author: req.body.author ? req.body.author : null
        });
        const savePost = await newpostData.save();
        if (savePost)
            return res.status(200).json({ status: true, message: `Partner post created successfully!`, PostData: savePost, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while adding partner post!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//edit partner post 
exports.editPartnerPost = async (req, res) => {
    try {
        const partnerPostExist = await partnerPost.findById(req.params.id);
        if (!partnerPostExist)
            return res.status(200).json({ status: false, message: `Post not found` });

        const updatedPost = await partnerPost.findByIdAndUpdate(
            req.params.id,
            {
                title: req.body.title ?? partnerPostExist.title,
                url: req.body.url ?? partnerPostExist.url,
                author: req.body.author ?? partnerPostExist.author
            },
            { new: true }
        );
        if (updatedPost)
            return res.status(200).json({ status: true, message: `Post updated successfully!`, PostData: updatedPost, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while updating Post!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete partner post
exports.deletePartnerPost = async (req, res) => {
    try {
        const partnerPostExist = await partnerPost.findById(req.params.id);
        if (!partnerPostExist)
            return res.status(200).json({ status: false, message: `Partner post not found` });

        const deletePartnerPost = await partnerPost.findByIdAndDelete(req.params.id);
        if (deletePartnerPost)
            return res.status(200).json({ status: true, message: `Partner post deleted successfully!` });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while deleting partner post!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all partner post list
exports.getPartnerPostByPartnerId = async (req, res) => {
    try {

        const partnerId = ObjectId(req.params.partnerId)
        var partnerPostList = await partnerPost.aggregate([
            {
                $match: {
                    partnerId: partnerId,
                    isDelete: false
                }
            },
            {
                $project: {
                    title: 1,
                    url: 1,
                    _id: 1,
                    partnerId: 1,
                    author: 1,
                    createdAt: 1,
                    updatedAt: 1,
                }
            }
        ])
        const partnerAllPostUrl = await partner.findById(partnerId).select({ urlToAllPosts: 1, category: 0, partnerType: 0, subcategory: 0 })
        if (partnerPostList) {
            return res.status(200).json({ status: true, message: `Partner Post list`, partnerPostList: partnerPostList, partnerAllPostUrl: partnerAllPostUrl ? partnerAllPostUrl.urlToAllPosts : "" });
        }
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting partner post list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
// partner post detail api
exports.getPartnerPostById = async (req, res) => {
    try {
        const partnerPostDetail = await partnerPost.findById(req.params.id);
        if (partnerPostDetail)
            return res.status(200).json({ status: true, message: `Partner post detail`, partnerPostDetail: partnerPostDetail });
        else
            return res.status(200).json({ status: false, message: `No data found for this partner post id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// apply url to partner posts api
exports.applyUrlToPost = async (req, res) => {
    try {
        const partnerPosts = await partnerPost.find({ _id: { $in: req.body.postIds } });
        if (partnerPosts.length > 0) {
            const updatePartnerPosts = await partnerPost.updateMany({ _id: { $in: req.body.postIds }, isDelete: false }, { url: req.body.url });
            if (updatePartnerPosts) {
                return res.status(200).json({ status: true, message: `All partner post url updated!`, updatePartnerPosts: updatePartnerPosts });
            } else {
                return res.status(200).json({ status: false, message: `Something went wrong while updating url to partner posts!`, });
            }
        }
        else
            return res.status(200).json({ status: false, message: `Partner posts are not available!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// apply url to All post btn api
exports.applyUrlToAllPostsBtn = async (req, res) => {
    try {
        const partnerForUrl = await partner.findById({ _id: req.body.partnerId });
        if (partnerForUrl) {
            const updatePartner = await partner.findOneAndUpdate({ _id: req.body.partnerId, isDelete: false }, { urlToAllPosts: req.body.url }, { new: true }).select("_id");
            if (updatePartner) {
                return res.status(200).json({ status: true, message: `URL to all posts updated!`, updatePartner: updatePartner });
            } else {
                return res.status(200).json({ status: false, message: `Something went wrong while updating url to all posts!`, });
            }
        }
        else
            return res.status(200).json({ status: false, message: `Partner not available!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};