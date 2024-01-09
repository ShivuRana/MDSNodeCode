const AWS = require("aws-sdk");
const mongoose = require("mongoose");
const { ObjectId } = require("mongodb");
const { deleteImage } = require("../../utils/mediaUpload");
const PartnerCategory = require("../../database/models/partner/partner_category");
const partnerSubCategory = require("../../database/models/partner/partner_subcategory");

const Partner = require("../../database/models/partner/partner");
const PartnerReview = require("../../database/models/partner/partnerReview");
const User = require("../../database/models/airTableSync");
const { AdminUser } = require("../../database/models/adminuser");
const moment = require("moment");
var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

//partner list when search 
exports.getPartnerBySearchAndFilter = async (req, res) => {
    try {

        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skip = (page - 1) * limit;

        var sort = { createdAt: -1 };
        var match = {
            isMDSPartner: true,
            isDelete: false,
            status: "published",
        };

        var name = "";
        if (req.query.name) {
            name = req.query.name;
            match = {
                ...match,
                companyName: { $regex: ".*" + name + ".*", $options: "i" },
            };
        }

        var shortDesc = "";
        if (req.query.shortDesc) {
            shortDesc = req.query.shortDesc;
            match = {
                ...match,
                OfferDescription: { $regex: ".*" + shortDesc + ".*", $options: "i" },
            };
        }

        var fullDesc = "";
        if (req.query.fullDesc) {
            fullDesc = req.query.fullDesc;
            match = {
                ...match,
                OfferInstructions: { $regex: ".*" + fullDesc + ".*", $options: "i" },
            };
        }

        const data = await Partner.aggregate([
            {
                $match: match,
            },
            {
                $lookup: {
                    from: 'partnerbadges',
                    localField: 'partnerType',
                    foreignField: '_id',
                    as: 'typeData'
                }
            },
            { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    companyName: 1,
                    isMDSPartner: 1,
                    status: 1,
                    partnerType: "$typeData.name",
                    pageView: 1,
                    claims: 1,
                    rating: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }

        ]);

        const count = await Partner.countDocuments({
            ...match,
        });

        if (data.length > 0 && count) {
            return res.status(200).json({
                status: true, message: `Partners list retrive successfully.`,
                data: {
                    partners: data,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        } else {
            return res.status(200).json({
                status: false, message: `Partners list not found!`,
                data: {
                    partners: [],
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//partner list when filter applied 
exports.getPartnerByFilter = async (req, res) => {
    try {

        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skip = (page - 1) * limit;

        var sort = { createdAt: -1 };
        var match = {
            isMDSPartner: true,
            isDelete: false,
            status: "published",
        };

        var filter = "";
        if (req.query.filter) {
            filter = req.query.filter;
            match = {
                ...match,
                MDSType: { $eq: filter },
            };
        }

        const data = await Partner.aggregate([
            {
                $match: match,
            },
            {
                $lookup: {
                    from: 'partnerbadges',
                    localField: 'partnerType',
                    foreignField: '_id',
                    as: 'typeData'
                }
            },
            { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    companyName: 1,
                    isMDSPartner: 1,
                    status: 1,
                    partnerType: "$typeData.name",
                    pageView: 1,
                    claims: 1,
                    rating: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }

        ]);

        const count = await Partner.countDocuments({
            ...match,
        });

        if (data.length > 0 && count) {
            return res.status(200).json({
                status: true, message: `Partners list filter successfully.`,
                data: {
                    partners: data,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        } else {
            return res.status(200).json({
                status: false, message: `Partners list not found!`,
                data: {
                    partners: [],
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//sorted partner list 
exports.getPartnerBySorting = async (req, res) => {
    try {

        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skip = (page - 1) * limit;

        var sort = { createdAt: -1 };
        var match = {
            isMDSPartner: true,
            isDelete: false,
            status: "published",
        };

        if (req.query.value !== undefined && req.query.value !== null && req.query.value !== "") {
            sort = { offerValue: -1 };
        }

        if (req.query.rating !== undefined && req.query.rating !== null && req.query.rating !== "") {
            sort = { rating: -1 };
        }

        if (req.query.partnerType !== undefined && req.query.partnerType !== null && req.query.partnerType !== "") {
            const partType = req.query.partnerType;
            if (partType === "preferred") {
                sort = { preferredCount: -1 };
            } else if (partType === "exclusive") {
                sort = { exclusiveCount: -1 };
            } else if (partType === "premiere") {
                sort = { premiereCount: -1 };
            } else if (partType === "normal") {
                sort = { normalCount: -1 };
            }
        }

        const data = await Partner.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'partnerbadges',
                    localField: 'partnerType',
                    foreignField: '_id',
                    as: 'typeData'
                }
            },
            { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    preferredCount: {
                        $sum: {
                            $cond: [{ $eq: ["$partnerType", "preferred"] }, 1, 0]
                        }
                    },
                },
            },
            {
                $addFields: {
                    exclusiveCount: {
                        $sum: {
                            $cond: [{ $eq: ["$partnerType", "exclusive"] }, 1, 0]
                        }
                    },
                },
            },
            {
                $addFields: {
                    premiereCount: {
                        $sum: {
                            $cond: [{ $eq: ["$partnerType", "premiere"] }, 1, 0]
                        }
                    },
                },
            },
            {
                $addFields: {
                    normalCount: {
                        $sum: {
                            $cond: [{ $eq: ["$partnerType", "normal"] }, 1, 0]
                        }
                    },
                },
            },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    companyName: 1,
                    isMDSPartner: 1,
                    status: 1,
                    partnerType: "$typeData.name",
                    pageView: 1,
                    claims: 1,
                    rating: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            }

        ]);

        const count = await Partner.countDocuments({
            ...match,
        });

        if (data.length > 0 && count) {
            return res.status(200).json({
                status: true, message: `Partners list sorted successfully.`,
                data: {
                    partners: data,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        } else {
            return res.status(200).json({
                status: false, message: `Partners list not found!`,
                data: {
                    partners: [],
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//partner list filter and sorting and search API
exports.getPartnerByFilterAndSorting = async (req, res) => {
    try {
        const page = parseInt(req.query.page);
        const limit = parseInt(req.query.limit);
        const skip = (page - 1) * limit;

        var sort = { "partnerType.order": 1, badgeOrder: 1 };
        var match = {
            isDelete: false,
            status: "published",
        };

        var filter = "";
        if (req.query.filter) {
            filter = req.query.filter;
            match = {
                ...match,
                MDSType: { $eq: filter },
            };
        }

        var categoryIds = [];
        if (req.query.categoryId && req.query.categoryId !== null && req.query.categoryId !== undefined) {
            categoryIds = [ObjectId(req.query.categoryId)];
            if (categoryIds.length > 0) {
                match = {
                    ...match,
                    category: { $in: categoryIds }
                };
            }
        }

        var name = "";
        if (req.query.name) {
            name = req.query.name;
            match = {
                ...match,
                $or: [
                    { companyName: { $regex: ".*" + name + ".*", $options: "i" }, },
                    { description: { $regex: ".*" + name + ".*", $options: "i" }, },
                    { offerValue: { $regex: ".*" + name + ".*", $options: "i" }, },
                    { OfferDescription: { $regex: ".*" + name + ".*", $options: "i" }, },
                    { OfferInstructions: { $regex: ".*" + name + ".*", $options: "i" }, },
                    { shortDescription: { $regex: ".*" + name + ".*", $options: "i" }, },
                ]
            };
        }

        var shortDesc = "";
        if (req.query.shortDesc) {
            shortDesc = req.query.shortDesc;
            match = {
                ...match,
                OfferDescription: { $regex: ".*" + shortDesc + ".*", $options: "i" },
            };
        }

        var fullDesc = "";
        if (req.query.fullDesc) {
            fullDesc = req.query.fullDesc;
            match = {
                ...match,
                OfferInstructions: { $regex: ".*" + fullDesc + ".*", $options: "i" },
            };
        }

        if (req.query.newest === "newest") {
            sort = { createdAt: -1, "partnerType.order": 1, badgeOrder: 1 };
        }

        if (req.query.value === "value") {
            sort = { offerValue: -1, "partnerType.order": 1, badgeOrder: 1 };
        }

        if (req.query.rating === "rating") {
            sort = { rating: -1, "partnerType.order": 1, badgeOrder: 1 };
        }

        var partType = "";
        if (req.query.partnerType !== undefined && req.query.partnerType !== null && req.query.partnerType !== "") {
            partType = ObjectId(req.query.partnerType);
            sort = { partnerTypeCount: -1, "partnerType.order": 1, badgeOrder: 1 };
        }

        const data = await Partner.aggregate([
            {
                $match: match,
            },
            {
                $lookup: {
                    from: 'partnerbadges',
                    localField: 'partnerType',
                    foreignField: '_id',
                    pipeline: [
                        { $match: { isDelete: false } },
                        { $sort: { order: 1 } },
                        { $project: { _id: 1, name: 1, order: 1, badgeColor: 1 } }
                    ],
                    as: 'partnerType'
                }
            },
            { $unwind: { path: "$partnerType", preserveNullAndEmptyArrays: true } },
            {
                $addFields: {
                    partnerTypeCount: {
                        $sum: {
                            $cond: [{ $eq: ["$partnerType._id", partType] }, 1, 0]
                        }
                    },
                },
            },
            { $sort: sort },
            { $skip: skip },
            { $limit: limit },
            {
                $project: {
                    _id: 1,
                    companyName: 1,
                    thumbnail: 1,
                    description: 1,
                    shortDescription: 1,
                    partnerType: 1,
                    MDSType: 1,
                    rating: 1,
                    offerValue: 1,
                    status: 1,
                    category: 1,
                    badgeOrder: 1,
                }
            }
        ]);

        const count = await Partner.countDocuments({
            ...match,
        });

        if (data.length > 0 && count) {
            return res.status(200).json({
                status: true, message: `Partners list retrive successfully.`,
                data: {
                    filterType: filter,
                    partners: data,
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        } else {
            return res.status(200).json({
                status: true, message: `Partners list not found!`,
                data: {
                    filterType: filter,
                    partners: [],
                    currentPage: page,
                    totalPages: Math.ceil(count / limit),
                    totalPartners: count,
                },
            });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner detail update user counts anf total count api
exports.getPartnerDetails = async (req, res) => {
    try {
        const authUser = req.authUserId;

        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "" && authUser !== null) {

            let partnerDetail = await Partner.aggregate([
                {
                    $match: {
                        _id: ObjectId(req.params.id),
                        isDelete: false,
                        status: "published"
                    }
                },
                {
                    $lookup: {
                        from: 'partnerbadges',
                        localField: 'partnerType',
                        foreignField: '_id',
                        pipeline: [
                            { $project: { _id: 1, name: 1, badgeColor: 1 } }
                        ],
                        as: 'partnerType'
                    }
                },
                { $unwind: { path: "$partnerType", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "partner_categories",
                        localField: "category",
                        foreignField: "_id",
                        pipeline: [{
                            $project: {
                                name: 1,
                                categoryImage: 1,
                                subcategory: 1,
                            }
                        }],
                        as: "partnerCategory",
                    },
                },
                {
                    $lookup: {
                        from: "partnerhelpfullinks",
                        localField: "_id",
                        foreignField: "partnerId",
                        pipeline: [{
                            $project: {
                                title: 1,
                                url: 1,
                                linkIcon: 1
                            }
                        }],
                        as: "helpfulLinks",
                    },
                },
                {
                    $project: {
                        companyLogo: 1,
                        darkCompanyLogo: 1,
                        description: 1,
                        shortDescription: 1,
                        webBanner: 1,
                        thumbnail: 1,
                        mobileBanner: 1,
                        category: 1,
                        urlToAllPosts: 1,
                        contactInfo: {
                            contactName: {
                                $cond: [
                                    {
                                        "$ifNull":
                                            ["$contactInfo.contactName", false]
                                    },
                                    "$contactInfo.contactName",
                                    ""
                                ]
                            },
                            phoneNumber: {
                                $cond: [
                                    {
                                        "$ifNull":
                                            ["$contactInfo.phoneNumber", false]
                                    },
                                    "$contactInfo.phoneNumber",
                                    ""
                                ]
                            },
                            email: {
                                $cond: [
                                    {
                                        "$ifNull":
                                            ["$contactInfo.email", false]
                                    },
                                    "$contactInfo.email",
                                    ""
                                ]
                            },
                            website: {
                                $cond: [
                                    {
                                        "$ifNull":
                                            ["$contactInfo.website", false]
                                    },
                                    "$contactInfo.website",
                                    ""
                                ]
                            },
                            facebook: {
                                $cond: [
                                    {
                                        "$ifNull":
                                            ["$contactInfo.facebook", false]
                                    },
                                    "$contactInfo.facebook",
                                    ""
                                ]
                            },
                            linkedin: {
                                $cond: [
                                    {
                                        "$ifNull":
                                            ["$contactInfo.linkedin", false]
                                    },
                                    "$contactInfo.linkedin",
                                    ""
                                ]
                            },
                        },
                        offerValue: 1,
                        OfferDescription: 1,
                        partnerType: 1,
                        pageView: 1,
                        claims: 1,
                        userOfferViews: 1,
                        userViews: 1,
                        partnerCategory: 1,
                        helpfulLinks: 1,
                        rating: 1,
                    }
                }
            ]);
            if (partnerDetail.length > 0)
                return res.status(200).json({ status: true, message: `Partner detail retrive successully.`, partnerDetail: partnerDetail[0] });
            else
                return res.status(200).json({ status: false, message: `No data found for this partner id!` });
        } else {
            return res.status(200).json({ status: false, message: `Partner not found!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner detail videos 
exports.getPartnerDetailVideos = async (req, res) => {
    try {
        const authUser = req.authUserId;
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "" && authUser !== null) {

            let partnerDetailVideos = await Partner.aggregate([
                {
                    $match: {
                        _id: ObjectId(req.params.id),
                        isDelete: false,
                        status: "published"
                    }
                },
                {
                    $lookup: {
                        from: "contentarchive_videos",
                        localField: "videoIds.id",
                        foreignField: "_id",
                        pipeline: [
                            {
                                $lookup: {
                                    from: "contentarchive_categories",
                                    localField: "categories",
                                    foreignField: "_id",
                                    pipeline: [{
                                        $project: { name: 1 },
                                    }],
                                    as: "videocategory"
                                }
                            },
                            {
                                $project: {
                                    title: 1,
                                    video: 1,
                                    duration: 1,
                                    thumbnail: 1,
                                    views: { $size: "$views" },
                                    videocategory: 1,
                                    createdAt: 1,
                                    user_video_pause: 1,
                                }
                            }],
                        as: "partnerVideos",
                    },
                },
                {
                    $project: {
                        partnerVideos: {
                            $map: {
                                input: "$partnerVideos",
                                as: "partnerVideo",
                                in: {
                                    $mergeObjects: [
                                        "$$partnerVideo",
                                        {
                                            $let: {
                                                vars: {
                                                    test: {
                                                        $arrayElemAt: [
                                                            {
                                                                $filter: {
                                                                    input: "$videoIds",
                                                                    cond: { $eq: ["$$this.id", "$$partnerVideo._id"] }
                                                                }
                                                            },
                                                            0
                                                        ]
                                                    }
                                                }, in: { order: "$$test.order", status: { $ifNull: ["$$test.status", "published"] } }
                                            }
                                        }
                                    ]
                                }
                            }
                        },
                    }
                }
            ]);

            let partnerVideoLists = partnerDetailVideos[0]
            const videoList = partnerDetailVideos[0].partnerVideos.sort((a, b) => a.order - b.order)
            var arr = [];
            for (var i = 0; i < videoList.length; i++) {
                if (videoList[i].status !== "hidden") {
                    var url = s3.getSignedUrl("getObject", {
                        Bucket: "arn:aws:s3:us-east-2:496737174815:accesspoint/accessforapp",
                        Key: videoList[i].video,
                        Expires: 100000,
                    });
                    arr.push({ ...videoList[i], video: url });
                }

            }
            const data = arr;
            partnerVideoLists.partnerVideos = data;

            if (partnerDetailVideos.length > 0)
                return res.status(200).json({ status: true, message: `Partner detail videos retrive successully.`, partnerDetail: partnerVideoLists });
            else
                return res.status(200).json({ status: false, message: `No data found for this partner id!` });
        } else {
            return res.status(200).json({ status: false, message: `Partner not found!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner detail posts 
exports.getPartnerDetailPosts = async (req, res) => {
    try {
        const authUser = req.authUserId;
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "" && authUser !== null) {

            let partnerDetailPosts = await Partner.aggregate([
                {
                    $match: {
                        _id: ObjectId(req.params.id),
                        isDelete: false,
                        status: "published"
                    }
                },
                {
                    $lookup: {
                        from: "partnerposts",
                        localField: "_id",
                        foreignField: "partnerId",
                        pipeline: [
                            {
                                $project: {
                                    title: 1,
                                    url: 1,
                                    author: 1,
                                }
                            }],
                        as: "partnerPosts",
                    },
                },
                {
                    $project: {

                        partnerPosts: 1,

                    }
                }
            ]);
            if (partnerDetailPosts.length > 0)
                return res.status(200).json({ status: true, message: `Partner detail retrive successully.`, partnerDetail: partnerDetailPosts[0] });
            else
                return res.status(200).json({ status: false, message: `No data found for this partner id!` });
        } else {
            return res.status(200).json({ status: false, message: `Partner not found!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partners in other categories 
exports.getPartnersInOtherCategories = async (req, res) => {
    try {
        const partnerId = req.params.id !== undefined && req.params.id !== null && req.params.id !== "" ? req.params.id : ""
        const categoryId = req.query.category !== undefined && req.query.category !== null && req.query.category !== "" ? req.query.category : ""
        const type = req.query.type !== undefined && req.query.type !== null && req.query.type !== "" ? req.query.type : ""

        if (partnerId !== "" && categoryId !== "" && type !== "") {
            const relatedPartners = await Partner.find({ category: { $in: [ObjectId(categoryId)] }, _id: { $ne: ObjectId(req.params.id) }, status: "published", isDelete: false, MDSType: type }).select('companyName companyLogo description shortDescription offerValue OfferDescription MDSType partnerType thumbnail mobileBanner webBanner rating -subcategory -category').limit(2).lean();
            if (relatedPartners.length > 0)
                return res.status(200).json({ status: true, message: `Partner list retrived successfully.`, partnerListInOther: relatedPartners });
            else
                return res.status(200).json({ status: false, message: `Partner list not found!`, partnerListInOther: [] });
        } else {
            return res.status(200).json({ status: false, message: `Input paramaters are missing!`, });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
}

// partner offer update user counts and total count api
exports.updateGetOfferDetailsCount = async (req, res) => {
    try {
        const authUser = req.authUserId;
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "" && authUser !== null) {
            const userOfferData = {
                userId: authUser,
                offerCount: 1,
            }
            var partnerDetail = {};

            let alreadyExist = await Partner.findOne({ _id: new ObjectId(req.params.id), userOfferViews: { $elemMatch: { userId: new ObjectId(authUser) } } }, { _id: 1, "userOfferViews.$": 1 });

            if (alreadyExist !== null) {
                partnerDetail = await Partner.findOneAndUpdate({ _id: new ObjectId(req.params.id), userOfferViews: { $elemMatch: { userId: authUser } } }, { $inc: { "userOfferViews.$.offerCount": 1, claims: 1 } }, { new: true }).select("-featuredPartner -featuredPartnerOrder -freshDealPartner -freshDealPartnerOrder -urlToAllPosts -pageView -__v -userViews -claims -category -subcategory");
            } else {
                partnerDetail = await Partner.findOneAndUpdate({ _id: new ObjectId(req.params.id) }, { $push: { userOfferViews: userOfferData }, $inc: { claims: 1 } }, { new: true }).select("-featuredPartner -featuredPartnerOrder -freshDealPartner -freshDealPartnerOrder -urlToAllPosts -pageView -__v -userViews -claims -category -subcategory");
            }

            if (partnerDetail)
                return res.status(200).json({ status: true, message: `Partner detail retrive successully.`, partnerDetail: partnerDetail });
            else
                return res.status(200).json({ status: false, message: `No data found for this partner id!` });
        } else {
            return res.status(200).json({ status: false, message: `Partner not found!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get Partner Review Details api
exports.getPartnerReviewDetails = async (req, res) => {
    try {
        const authUser = req.authUserId;
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "" && authUser !== null) {
            let partnerDetail = await Partner.findOne({ _id: new ObjectId(req.params.id) }, { _id: 1, companyName: 1, companyLogo: 1, darkCompanyLogo: 1, description: 1, shortDescription: 1, status: 1, partnerType: 1, MDSType: 1, isMDSPartner: 1, rating: 1, category: 0, }).lean();
            const partnerReviewList = await PartnerReview.find({ isDelete: false, partnerId: ObjectId(req.params.id), status: "approved" }).sort({ createdAt: -1 });

            if (partnerReviewList.length > 0) {
                partnerDetail = { ...partnerDetail, partnerReviews: partnerReviewList ? partnerReviewList : [] };
            }

            if (partnerDetail !== null)
                return res.status(200).json({ status: true, message: `Partner detail retrive successully.`, data: partnerDetail });
            else
                return res.status(200).json({ status: false, message: `No data found for this partner id!` });
        } else {
            return res.status(200).json({ status: false, message: `Partner not found!`, });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

//get category list for partner offer/perk listing
exports.getAllCategoryLists = async (req, res) => {
    try {
        const authUser = req.authUserId;
        const categoryList = await PartnerCategory.find({ isDelete: false }).select("_id name");;
        if (categoryList)
            return res.status(200).json({ status: true, message: `Category lists retrive successully.`, data: categoryList });
        else
            return res.status(200).json({ status: false, message: `No categories found!` });

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};