const User = require("../../database/models/airTableSync");
const ContentArchiveVideo = require("../../database/models/contentArchive_video");
const Partner = require("../../database/models/partner/partner");
const ContentCategory = require("../../database/models/partner/partner_category");
const ContentSubCategory = require("../../database/models/partner/partner_subcategory");
const ObjectId = require("mongoose").Types.ObjectId;
const { deleteImage } = require("../../utils/mediaUpload");
const AWS = require("aws-sdk");
const categoryPartner = require("../../database/models/partner/categoryPartner");
const moment = require("moment");
const PartnerBadge = require("../../database/models/partner/partnerBadges");
const partnerReview = require("../../database/models/partner/partnerReview");
var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

/** start Create, edit, delete and get all partner adminside apis**/

// create Partner
exports.createPartner = async (req, res) => {
    try {
        const body = req.body;
        let description = `<div "font-family: 'Muller';">${body.description}</div>`;
        body.description = description;
        if (body.companyName === undefined && body.companyName === "" && body.companyName === null) {
            return res.status(401).json({ status: false, message: "Company name is required!", });
        }

        const partnerBadge = await PartnerBadge.findOne({ name: "nobadge", isDelete: false }, { _id: 1 });

        if (req.body.partnerType === undefined) {
            req.body.partnerType = partnerBadge._id;
        }

        const newPartner = new Partner({
            companyName: req.body.companyName,
            companyLogo: req.partnerIcon,
            darkCompanyLogo: req.darkCompanyLogo,
            description: req.body.description ? `<div "font-family: 'Muller';">${body.description}</div>` : '',
            contactInfo: req.body.contactInfo,
            isMDSPartner: req.body.isMDSPartner,
            status: req.body.status,
            MDSType: req.body.MDSType,
            partnerType: req.body.partnerType,
            category: req.body.category,
            subcategory: req.body.subcategory,
            webBanner: req.webBanner,
            thumbnail: req.thumbnail,
            mobileBanner: req.mobileBanner,
            offerValue: req.body.offerValue,
            OfferDescription: req.body.OfferDescription ? `<div "font-family: 'Muller';">${body.OfferDescription}</div>` : '',
            OfferInstructions: req.body.OfferInstructions ? `<div "font-family: 'Muller';">${body.OfferInstructions}</div>` : '',
            tag: body.tag,
            shortDescription: body.shortDescription ? body.shortDescription : '',
        });

        const partnerData = await newPartner.save();

        if (partnerData) {
            return res.status(200).json({ status: true, message: "Partner added successfully!", data: partnerData });
        } else {
            return res.status(200).json({ status: false, message: "Something went wrong while adding partner!", });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error. ${error}` });
    }
};

// edit Partner
exports.editPartner = async (req, res) => {

    try {
        const body = req.body;
        const partnerExist = await Partner.findById(req.params.id);

        if (!partnerExist)
            return res.status(200).json({ status: false, message: ` not found` });

        if (req.partnerIcon) {
            deleteImage(partnerExist.companyLogo);
        }
        if (req.darkCompanyLogo) {
            deleteImage(partnerExist.darkCompanyLogo);
        }
        if (req.webBanner) {
            deleteImage(partnerExist.webBanner);
        }
        if (req.thumbnail) {
            deleteImage(partnerExist.thumbnail);
        }
        if (req.mobileBanner) {
            deleteImage(partnerExist.mobileBanner);
        }

        const partnerBadge = await PartnerBadge.findOne({ name: "nobadge", isDelete: false }, { _id: 1 });

        if (req.body.partnerType === undefined) {
            req.body.partnerType = partnerBadge._id;
        }

        const updated = await Partner.findByIdAndUpdate(
            req.params.id,
            {
                companyName: req.body.companyName ?? partnerExist.companyName,
                companyLogo: req.partnerIcon ?? partnerExist.companyLogo,
                darkCompanyLogo: req.darkCompanyLogo ?? partnerExist.darkCompanyLogo,
                description: req.body.description ? `<div "font-family: 'Muller';">${body.description}</div>` : partnerExist.description,
                contactInfo: req.body.contactInfo ?? partnerExist.contactInfo,
                isMDSPartner: req.body.isMDSPartner ?? partnerExist.isMDSPartner,
                status: req.body.status ?? partnerExist.status,
                MDSType: req.body.MDSType ?? partnerExist.MDSType,
                partnerType: req.body.partnerType !== undefined ? req.body.partnerType : null,
                category: req.body.category ?? partnerExist.category,
                subcategory: req.body.subcategory ?? partnerExist.subcategory,
                webBanner: req.webBanner ?? partnerExist.webBanner,
                thumbnail: req.thumbnail ?? partnerExist.thumbnail,
                mobileBanner: req.mobileBanner ?? partnerExist.mobileBanner,
                offerValue: req.body.offerValue ?? partnerExist.offerValue,
                OfferDescription: `<div "font-family: 'Muller';">${req.body.OfferDescription}</div>` ?? partnerExist.OfferDescription,
                OfferInstructions: `<div "font-family: 'Muller';">${req.body.OfferInstructions}</div>` ?? partnerExist.OfferInstructions,
                tag: req.body.tag ?? partnerExist.tag,
                shortDescription: req.body.shortDescription ?? partnerExist.shortDescription,
            },
            { new: true }
        );

        if (updated)
            return res.status(200).json({ status: true, message: `Partner Successfully Updated.`, Data: updated, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while updating partner!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }

};

// delete partner
exports.deletePartner = async (req, res) => {
    try {
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "") {
            const partnerExist = await Partner.findById(req.params.id);
            if (!partnerExist)
                return res.status(200).json({ status: false, message: `Partner not found!` });

            if (partnerExist.companyLogo) deleteImage(partnerExist.companyLogo);

            const deletePartner = await Partner.findByIdAndUpdate(req.params.id, { isDelete: true }).select("_id");
            if (deletePartner)
                return res.status(200).json({ status: true, message: `Partner  deleted successfully!` });
            else
                return res.status(200).json({ status: false, message: `Something went wrong while deleting partner !`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }

};

// get all filter partner list - MDS partner
exports.getPartnerList = async (req, res) => {
    try {
        const page = req.query.page ? parseInt(req.query.page) : 0;
        const limit = req.query.limit ? parseInt(req.query.limit) : 0;
        const skip = (req.query.page && req.query.limit) ? (page - 1) * limit : 0;
        const mdsType = (req.query.mdstype) ? req.query.mdstype : "all";
        var filterType = ""
        var addFilterCount = 0
        var fromDate = new Date()
        var toDate = new Date()

        let comments = [];

        if (req.query.filtertype) {
            fromDate = req.query.fromdate
            toDate = req.query.todate
            filterType = req.query.filtertype

            switch (filterType) {
                case "first24hrs":
                    addFilterCount = 1
                    break;
                case "past7days":
                    addFilterCount = 6
                    break;
                case "past28days":
                    addFilterCount = 27
                    break;
                case "past90days":
                    addFilterCount = 89
                    break;
                case "past365days":
                    addFilterCount = 364
                    break;
                default:
                    break;
            }

            if (filterType === "custom") {
                toDate = moment(toDate).format('YYYY-MM-DD');
                fromDate = moment(fromDate).format('YYYY-MM-DD');
            } else {
                toDate = moment(new Date()).format('YYYY-MM-DD');
                fromDate = moment(new Date(new Date().setDate(new Date().getDate() - addFilterCount))).format('YYYY-MM-DD');
            }
        }
        var match = {
            isDelete: false,
            isMDSPartner: true,
        };

        if (mdsType !== "all")
        {
            match = {
                ...match,
                MDSType: mdsType,
            };
        }

        var search = "";
        if (req.query.search && req.query.search !== null && req.query.search !== "") {
            search = req.query.search;
            match = {
                ...match,
                companyName: { $regex: ".*" + search + ".*", $options: "i" },
            };
        }

        var badge = ""
        let matchBadge
        if (req.query.badge) {
            badge = req.query.badge;
            matchBadge = {
                ...match,
                partnerType: ObjectId(badge)
            };
        }

        let mergedMatch;
        mergedMatch = { ...match, ...matchBadge }


        const aggregatePipeline = [
            { $sort: { createdAt: -1 } },
            { $match: mergedMatch },
            {
                $lookup: {
                    from: 'partnerbadges',
                    localField: 'partnerType',
                    foreignField: '_id',
                    as: 'typeData'
                }
            },
            { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
        ];

        const aggregatePipelineCount = [
            { $sort: { createdAt: -1 } },
            { $match: mergedMatch },
            {
                $lookup: {
                    from: 'partnerbadges',
                    localField: 'partnerType',
                    foreignField: '_id',
                    as: 'typeData'
                }
            },
            { $unwind: { path: "$typeData", preserveNullAndEmptyArrays: true } },
        ];

        let partnerList = []
        comments = aggregatePipeline

        if (filterType !== "") {

            comments.push({
                $project: {
                    _id: 1,
                    companyName: 1,
                    companyLogo: 1,
                    darkCompanyLogo: 1,
                    isMDSPartner: 1,
                    MDSType:1,
                    status: 1,
                    partnerType: "$typeData.name",
                    pageView: 1,
                    claims: 1,
                    rating: 1,
                    badgeOrder: 1,
                    createdAt: (filterType !== "") ? { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$createdAt" } } } : 1,
                    updatedAt: 1,
                }
            })
            comments.push({
                $match: {
                    $and: (filterType !== "") ? [filterType !== "lifetime" ? { "createdAt": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "createdAt": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }] : [{ $expr: { $eq: [1, 1] } }, { $expr: { $eq: [1, 1] } }]
                }
            })
            if (page !== 0) {
                comments.push({ $skip: skip })
                comments.push({ $limit: limit })
            }

            if (req.query.badge) {
                comments.push({ $sort: { badgeOrder: 1 } })
            }

            partnerList = await Partner.aggregate([comments])
        } else {

            if (page !== 0) {
                comments.push({ $skip: skip })
                comments.push({ $limit: limit })
            }

            comments.push({
                $project: {
                    _id: 1,
                    companyName: 1,
                    companyLogo: 1,
                    darkCompanyLogo: 1,
                    isMDSPartner: 1,
                    MDSType:1,
                    status: 1,
                    partnerType: "$typeData.name",
                    pageView: 1,
                    claims: 1,
                    rating: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    badgeOrder: 1,
                }
            })

            if (req.query.badge) {
                comments.push({ $sort: { badgeOrder: 1 } })
            }
            partnerList = await Partner.aggregate([comments])
        }
        var count = 0;

        if (filterType !== "") {
            const dateMatch = { $and: [filterType !== "lifetime" ? { "createdAt": { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }, filterType !== "lifetime" ? { "createdAt": (filterType !== "first24hrs" && filterType !== "lifetime") ? { $gte: new Date(fromDate), $lte: new Date(toDate) } : filterType === "first24hrs" ? { $gte: moment().subtract(24, 'hours').toDate() } : { "$ne": null } } : { "$expr": { "$eq": [1, 1] } }] }
            const filteredPartners = await Partner.aggregate([
                ...aggregatePipelineCount,
                {
                    $project:
                    {
                        isDelete: 1,
                        isMDSPartner: 1,
                        MDSType:1,
                        companyName: 1,
                        typeData: 1,
                        createdAt: { $toDate: { $dateToString: { format: filterType == "first24hrs" ? "%Y-%m-%d %H:%m:%S" : "%Y-%m-%d", date: "$createdAt" } } },
                    }
                },
                {
                    $match: dateMatch
                }
            ]);

            const totalCount = filteredPartners.length
            count = totalCount
        } else {
            const totalCount = await Partner.aggregate(aggregatePipelineCount)
            count = totalCount.length;
        }

        if (partnerList.length > 0) {
            return res.status(200).json({
                status: true, message: `Partner list retrive successfully.`,
                data: {
                    partnerList: partnerList,
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalMessages: count,
                },
            });
        } else {
            return res.status(200).json({
                status: true, message: `Something went wrong while getting partner list!`,
                data: {
                    partnerList: [],
                    totalPages: Math.ceil(count / limit),
                    currentPage: page,
                    totalMessages: count,
                },
            });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};



// Partner list re-order Badge Filter Wise 
exports.badgeFilterWiseReOrderPartner = async (req, res) => {
    try {
        const ids = req.body.ids
        const objectPartnerIds = [];

        if (ids.length > 0) {
            let resOrder = ids.map(async (item, i) => {
                await Partner.findByIdAndUpdate(ObjectId(item), { badgeOrder: i + 1 }, { new: true }).select("_id")
                objectPartnerIds.push(ObjectId(item))
            });
            await Promise.all([...resOrder]);
        }

        const aggregatePipeline = [
            { $sort: { badgeOrder: 1 } },
            {
                $match: {
                    isDelete: false,
                    isMDSPartner: true,
                    _id: { $in: objectPartnerIds }
                }
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
        ];

        const reorderedPartner = await Partner.aggregate([
            ...aggregatePipeline,
            {
                $project: {
                    _id: 1,
                    companyName: 1,
                    companyLogo: 1,
                    darkCompanyLogo: 1,
                    isMDSPartner: 1,
                    status: 1,
                    partnerType: "$typeData.name",
                    pageView: 1,
                    claims: 1,
                    rating: 1,
                    createdAt: 1,
                    updatedAt: 1,
                    badgeOrder: 1,
                }
            }
        ])

        if (reorderedPartner.length > 0)
            return res.status(200).json({ status: true, message: "Reordered partners retrieved!", data: reorderedPartner });
        else
            return res.status(200).json({ status: false, message: "Partners not found!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner detail api
exports.getPartnerById = async (req, res) => {
    try {
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "") {
            const partnerDetail = await Partner.findOne({ _id: ObjectId(req.params.id) }, { _id: 1, companyName: 1, tag: 1, companyLogo: 1, darkCompanyLogo: 1, description: 1, isMDSPartner: 1, status: 1, MDSType: 1, partnerType: 1, category: 1, subcategory: 1, webBanner: 1, thumbnail: 1, mobileBanner: 1, OfferInstructions: 1, offerValue: 1, OfferDescription: 1, contactInfo: 1, isDelete: 1, shortDescription : 1});
            if (partnerDetail)
                return res.status(200).json({ status: true, message: `Partner  detail`, partnerDetail: partnerDetail });
            else
                return res.status(200).json({ status: false, message: `No data found for this partner id!` });
        } else {
            return res.status(200).json({ status: false, message: `Partner not found!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get all filter partner list
exports.getAllPartnerList = async (req, res) => {
    try {

        const mdsType = (req.query.mdstype) ? req.query.mdstype : "all";

        var match = {
            isDelete: false,
        }

        var search = "";
        if (req.query.search) {
            search = req.query.search;
            match = {
                ...match,
                companyName: { $regex: ".*" + search + ".*", $options: "i" },
            };
        }

        if (mdsType !== "all")
        {
            match = {
                ...match,
                MDSType: mdsType,
            };
        }

        const partnerList = await Partner.aggregate([
            { $sort: { createdAt: -1 } },
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
            {
                $project: {
                    _id: 1,
                    companyName: 1,
                    companyLogo: 1,
                    darkCompanyLogo: 1,
                    isMDSPartner: 1,
                    MDSType:1,
                    status: 1,
                    partnerType: "$typeData.name",
                    pageView: 1,
                    claims: 1,
                    rating: 1,
                    createdAt: 1,
                    updatedAt: 1,
                },
            },
        ]);

        if (partnerList.length > 0) {
            return res.status(200).json({ status: true, message: `Partner list retrive successfully.`, data: partnerList, });
        } else {
            return res.status(200).json({ status: true, message: `Partner list not found!`, data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner listing with selected fields for selecting feature partner or freshdeal -admin side
exports.getPublishedPartnersList = async (req, res) => {
    try {
        const partnerList = await Partner.find({ isDelete: false, status: "published", isMDSPartner: true, MDSType: "offer" }, {
            companyName: 1,
            companyLogo: 1,
            darkCompanyLogo: 1,
            featuredPartner: 1,
            freshDealPartner: 1,
            featuredPartnerOrder: 1,
            freshDealPartnerOrder: 1,
            MDSType: 1,
            category: 0,
            subcategory: 0
        });
        if (partnerList)
            return res.status(200).json({ status: true, message: "Successfully retrived partners list", data: partnerList })
        else
            return res.status(200).json({ status: false, message: "Something went wrong while retriving partners list", data: partnerList })
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}

// get featured partner list -admin side
exports.getFeaturedOrFreshdealPartnersList = async (req, res) => {
    try {

        const type = req.query.type
        const field = type !== undefined && type !== null && type === "freshdeal" ? "freshDealPartner" : "featuredPartner"
        const orderField = (type !== undefined && type !== null && type === "freshdeal" ? "freshDealPartnerOrder" : "featuredPartnerOrder")
        const partnerList = await Partner.find({ isDelete: false, status: "published", isMDSPartner: true, [`${field}`]: true }, {
            companyName: 1,
            companyLogo: 1,
            darkCompanyLogo: 1,
            freshDealPartner: 1,
            featuredPartner: 1,
            featuredPartnerOrder: 1,
            freshDealPartnerOrder: 1,
            category: 0,
            subcategory: 0
        }).sort({ [`${orderField}`]: 1 });

        if (partnerList)
            return res.status(200).json({ status: true, message: `Successfully retrived ${type} partners list!`, data: partnerList })
        else
            return res.status(200).json({ status: false, message: `Something went wrong while retriving ${type} partners list`, data: partnerList })
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}

// add partners in featured partner list
exports.addFeaturedOrFreshDealPartners = async (req, res) => {
    try {
        var partnersIds = req.body.partnersIds;
        const type = req.body.type
        const field = (type !== undefined && type !== null && type === "freshdeal" ? "freshDealPartner" : "featuredPartner")
        const maxCount = (type === "freshdeal" ? 5 : 10)
        if (partnersIds) {
          
            if ((partnersIds.length > maxCount)) {
                return res.status(200).json({ status: false, message: `${type === "freshdeal" ? "Freshdeal" : "Featured"} partners can't be more then ${maxCount}!` });
            } else {
                partnersIds = partnersIds.map((ids) => {
                    return ObjectId(ids);
                })
                const checkValidIds = await Partner.find({ isDelete: false, [`${field}`]: true, isMDSPartner: true, status: "published" }, { _id: 1, partnerType: 0, category: 0, subcategory: 0, });

                
                await Partner.updateMany({ _id: { $in: checkValidIds } }, { [`${field}`]: false });
                if (type === "freshdeal") {
                    let resOrder = partnersIds.map(async (item, i) => {
                        await Partner.findOneAndUpdate({ _id: item }, { freshDealPartnerOrder: i + 1, [`${field}`]: true }, { new: true });
                    });
                    await Promise.all([...resOrder]);
                } else {
                    let resOrder = partnersIds.map(async (item, i) => {
                        await Partner.findOneAndUpdate({ _id: item }, { featuredPartnerOrder: i + 1, [`${field}`]: true }, { new: true });
                    });
                    await Promise.all([...resOrder]);
                }

                const addFeaturedPartner = await Partner.find({ isDelete: false, [`${field}`]: true, isMDSPartner: true, status: "published" });

                if (addFeaturedPartner) {
                    return res.status(200).json({ status: true, message: `${type === "freshdeal" ? "Freshdeal" : "Featured"} partners added successfully!`, data: addFeaturedPartner });
                } else {
                    return res.status(200).json({ status: false, message: `Something went wrong while adding ${type} partner!` });
                }
                
            }
        } else {
            return res.status(200).json({ status: false, message: "Please add partner ids!" })
        }
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}

// remove featured/freshdeal partner
exports.removeFeaturedOrFreshDealPartner = async (req, res) => {
    try {
        const type = req.query.type
        const field = (type !== undefined && type !== null && type === "freshdeal" ? "freshDealPartner" : "featuredPartner")
        const updatePartner = await Partner.findByIdAndUpdate(req.params.partnerId, { [`${field}`]: false }).select("_id");
        if (updatePartner)
            return res.status(200).json({ status: true, message: `Removed ${type} partner successfully!`, data: updatePartner })
        else
            return res.status(200).json({ status: false, message: `Something went wrong while removing ${type} partner!`, data: updatePartner })
    } catch (e) {
        console.log(e, "error");
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}

// Reorder featured partner
exports.reorderFeaturedOrFreshDealPartner = async (req, res) => {
    try {
        const ids = req.body.ids
        const type = req.body.type
        const field = (type !== undefined && type !== null && type === "freshdeal" ? "freshDealPartnerOrder" : "featuredPartnerOrder")

        const objectPartnerIds = [];

        if (ids.length > 0) {
            let resOrder = ids.map(async (item, i) => {
                await Partner.findByIdAndUpdate(ObjectId(item), { [`${field}`]: i + 1 }, { new: true }).select("_id")
                objectPartnerIds.push(ObjectId(item))
            });
            await Promise.all([...resOrder]);
        }
        const reorderedFeaturedPartner = await Partner.find({ isDelete: false, _id: { $in: objectPartnerIds } }).sort({ [`${field}`]: 1 }).select({
            companyName: 1,
            companyLogo: 1,
            darkCompanyLogo: 1,
            freshDealPartner: 1,
            featuredPartner: 1,
            category: 0,
            subcategory: 0
        });
        if (reorderedFeaturedPartner.length > 0)
            return res.status(200).json({ status: true, message: "Reordered featured partners retrieved!", data: reorderedFeaturedPartner });
        else
            return res.status(200).json({ status: false, message: "Partners not found!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// category listing
exports.getCategoryListForPartner = async (req, res) => {
    try {

        const categoryList = await ContentCategory.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "partners",
                    localField: "_id",
                    foreignField: "category",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false,
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                partnerCount: { $sum: 1 },
                                pageView: 1,
                                claims: 1,
                                rating: 1,
                            }
                        }
                    ],
                    as: "partner",
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    categoryImage: 1,
                    partnerCount: { $cond: [{ $eq: ["$partner", []] }, 0, { $sum: "$partner.partnerCount" }] },
                    TotalPageViews: { $cond: [{ $eq: ["$partner", []] }, 0, { $sum: "$partner.pageView" }] },
                    TotalClaims: { $cond: [{ $eq: ["$partner", []] }, 0, { $sum: "$partner.claims" }] },
                    TotalRating: { $cond: [{ $eq: ["$partner", []] }, 0, { $sum: "$partner.rating" }] }
                }
            }
        ]);

        if (categoryList)
            return res.status(200).json({ status: true, message: "Successfully retrived category list", data: categoryList })
        else
            return res.status(200).json({ status: false, message: "Something went wrong while retriving category list", data: categoryList })
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}

// partner listing by category id
exports.getCategoryWisePartnerList = async (req, res) => {
    try {

        const partnerList = await Partner.aggregate([
            {
                $match: {
                    isDelete: false,
                    category: ObjectId(req.params.categoryId)
                }
            }
        ]);

        if (partnerList)
            return res.status(200).json({ status: true, message: "Successfully retrived partners list", data: partnerList })
        else
            return res.status(200).json({ status: false, message: "Something went wrong while retriving partners list", data: partnerList })
    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}

// update status of partner
exports.updateStatusPartner = async (req, res) => {
    try {
        if (req.params.id !== undefined && req.params.id !== null && req.params.id !== "" && req.query.status && req.query.status !== undefined) {
            const partnerExist = await Partner.findById(req.params.id);
            if (!partnerExist)
                return res.status(200).json({ status: false, message: "Partner details not found!" });

            const updatePartnerStatus = await Partner.findByIdAndUpdate(req.params.id, { status: req.query.status }, { new: true }).select("_id companyName status");
            if (updatePartnerStatus)
                return res.status(200).json({ status: true, message: `Partner status updated successfully.`, data: updatePartnerStatus });
            else
                return res.status(200).json({ status: false, message: `Something went wrong while updating status of partner!`, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// End of Admin apis

// Start of User-frontend side apis

// partner  detail api for user
exports.getPartnerByIdForUser = async (req, res) => {
    try {

        const partnerDetail = await Partner.aggregate([
            {
                $match: {
                    _id: ObjectId(req.params.id),
                    isDelete: false,
                    status: "published"
                }
            },
            {
                $lookup: {
                    from: "partnerhelpfullinks",
                    localField: "_id",
                    foreignField: "partnerId",
                    as: "helpfulLinks",
                },
            },
            {
                $lookup: {
                    from: "partnerposts",
                    localField: "_id",
                    foreignField: "partnerId",
                    as: "partnerPosts",
                },
            },
            {
                $lookup: {
                    from: "partnerreviews",
                    localField: "_id",
                    foreignField: "partnerId",
                    as: "partnerReviews",
                },
            },
            {
                $lookup: {
                    from: "contentarchive_categories",
                    localField: "_id",
                    foreignField: "category",
                    as: "partnerCategory",
                },
            },
            {
                $lookup: {
                    from: "contentarchive_videos",
                    localField: "_id",
                    foreignField: "category",
                    as: "partnerCategory",
                },
            },
            {
                $project: {
                    description: 1,
                    webBanner: 1,
                    thumbnail: 1,
                    mobileBanner: 1,
                    category: 1,
                    urlToAllPosts: 1,
                    contactInfo: 1,
                    helpfulLinks: 1,
                    partnerPosts: 1,
                    partnerReviews: 1,
                    partnerCategory: 1,
                    shortDescription:1,
                }
            }
        ]);

        if (partnerDetail)
            return res.status(200).json({ status: true, message: `Partner  detail`, partnerDetail: partnerDetail });
        else
            return res.status(200).json({ status: false, message: `No data found for this partner id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get featured partner list for user
exports.getFeaturedOrFreshDealPartnersListForUser = async (req, res) => {
    try {
        const field = req.query.type !== undefined && req.query.type !== null && req.query.type === "freshdeal" ? "freshDealPartner" : "featuredPartner";
        const orderField = req.query.type !== undefined && req.query.type !== null && req.query.type === "freshdeal" ? "freshDealPartnerOrder" : "featuredPartnerOrder";
        const filter = req.query.filter !== undefined && req.query.filter !== null ? req.query.filter : "offer";
        var matchDefault = {
            isDelete: false,
            status: "published",
            isMDSPartner: true,
        };

        var match = {};
        if (req.query.type) {
            match = {
                ...matchDefault,
                [`${field}`]: true,
            };
        }

        const partnerList = await Partner.aggregate([
            { $sort: { [`${orderField}`]: 1 } },
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
                $project: {
                    companyName: 1,
                    companyLogo: 1,
                    darkCompanyLogo: 1,
                    featuredPartnerOrder: 1,
                    freshDealPartnerOrder: 1,
                    thumbnail: 1,
                    MDSType: 1,
                    rating: 1,
                    description: 1,
                    shortDescription:1,
                    offerValue: 1,
                    partnerType: {
                        $cond: [
                            {
                                "$ifNull":
                                    ["$typeData", false]
                            },
                            {
                                _id: "$typeData._id",
                                name: "$typeData.name",
                                badgeColor: "$typeData.badgeColor",
                            }, null
                        ]
                    },
                },
            }
        ]);

        const partnerCount = await Partner.countDocuments({ ...matchDefault, MDSType: filter });

        if (partnerList.length > 0)
            return res.status(200).json({ status: true, message: `Successfully retrived ${req.query.type} partners list`, data: { partnerList: partnerList, partnerCount: partnerCount } });
        else
            return res.status(200).json({ status: false, message: `${req.query.type} partners list not found!`, data: partnerList });
    } catch (e) {
        console.log(e, "error");
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}
// category listing
exports.getFrontendCategoryListForPartner = async (req, res) => {
    try {
        const mdsType = (req.query.type !== undefined && req.query.type !== null) ? req.query.type : "offer"
        const categoryList = await ContentCategory.aggregate([
            {
                $match: {
                    isDelete: false
                }
            },
            {
                $lookup: {
                    from: "partners",
                    localField: "_id",
                    foreignField: "category",
                    pipeline: [
                        {
                            $match: {
                                isDelete: false,
                                isMDSPartner: true,
                                MDSType: mdsType,
                                status: "published"
                            },
                        },
                        {
                            $project: {
                                _id: 1,
                                partnerCount: { $sum: 1 },
                                pageView: 1,
                            }
                        }
                    ],
                    as: "partner",
                },
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    categoryImage: 1,
                    partnerCount: { $cond: [{ $eq: ["$partner", []] }, 0, { $sum: "$partner.partnerCount" }] },
                    pageView: "$partner.pageView",
                }
            },
            {
                $match: {
                    partnerCount: { $ne: 0 }
                }
            },
            // { $sort: { views: -1, name: 1 } },
            { $sort: { pageView: -1 } }
        ])

        if (categoryList)
            return res.status(200).json({ status: true, message: "Successfully retrived category list", data: categoryList })
        else
            return res.status(200).json({ status: false, message: "Something went wrong while retriving category list", data: categoryList })

    } catch (e) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: e })
    }
}

// select partner list for user
exports.getSelectPartnerList = async (req, res) => {
    try {
        var match = {
            isDelete: false,
            isMDSPartner: true,
            MDSType:"offer",
            status: "published"
        }

        var search = "";
        if (req.query.search) {
            search = req.query.search;
            match = {
                ...match,
                companyName: { $regex: ".*" + search + ".*", $options: "i" },
            };
        }

        const partnerList = await Partner.aggregate([
            { $match: match },
            {
                $lookup: {
                    from: 'partnerreviews',
                    localField: '_id',
                    foreignField: 'partnerId',
                    as: 'partnerReviews'
                }
            },
            {
                $project: {
                    _id: 1,
                    companyName: 1,
                    thumbnail: 1,
                    isMDSPartner: 1,
                    description: 1,
                    shortDescription:1,
                    status: 1,
                    offerValue : 1,
                    countPartnerReviews: { $cond: { if: { $isArray: "$partnerReviews" }, then: { $size: "$partnerReviews" }, else: "NA" } },
                    "partnerReviews": { _id: 1, status: 1 }
                },
            },
            { $sort: { countPartnerReviews: 1 } },
        ]);

        if (partnerList.length > 0) {
            return res.status(200).json({ status: true, message: `Partner list retrive successfully.`, data: partnerList, });
        } else {
            return res.status(200).json({ status: true, message: `Partner list not found!`, data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get Review Count By UserId
exports.getReviewCountByUserId = async (req, res) => {
    try {
        const authUser = req.authUserId;
        var match = { userId: authUser }
        const UserReview = await partnerReview.find(match).select({ userId: 0, updatedAt: 0, IsNew: 0, reasonId: 0, rejectNotes: 0, __v: 0 })
        if (UserReview.length < 3) {
            return res.status(200).json({ status: true, message: `User Review List.`, data: { countStatus: true, reviewCount: UserReview.length, UserReview: UserReview } });
        } else {
            return res.status(200).json({ status: true, message: `No Need to give more Review`, data: { countStatus: false }, });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};
