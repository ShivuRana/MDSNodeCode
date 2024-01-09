const PartnerBadge = require("../../database/models/partner/partnerBadges");
const partnerSearch = require("../../database/models/partner/partnerSearch");
const Partner = require("../../database/models/partner/partner");
const User = require("../../database/models/airTableSync");
const ObjectId = require("mongoose").Types.ObjectId;

const AWS = require("aws-sdk");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create partner Badge
exports.createPartnerBadge = async (req, res) => {
    try {
        const partnerBadge = await PartnerBadge.find({ name: req.body.name, isDelete: false });

        if (partnerBadge && partnerBadge.length > 0) {
            return res.status(200).json({ status: false, message: `Badge name must be unique.` });
        }
        const ids = await PartnerBadge.find({ name: { $ne: "nobadge" }, isDelete: false }, { _id: 1, order: 1 }).sort({ order: -1 });
        let badgeOrder = (ids && ids.length > 0) ? ids[0].order + 1 : 1

        const newpartnerBadge = new PartnerBadge({
            name: req.body.name,
            order: badgeOrder,
            badgeColor: req.body.badgeColor,
        });
        const saveName = await newpartnerBadge.save();
        if (saveName)
            return res.status(200).json({ status: true, message: `Partner Badge created successfully!`, data: saveName, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while adding partner Badge!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

//edit partner Badge 
exports.editPartnerBadge = async (req, res) => {
    try {
        const getPartnerBadge = await PartnerBadge.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (!getPartnerBadge)
            return res.status(200).json({ status: false, message: `Badge not found` });

        if (req.body.name !== getPartnerBadge.name) {
            const partnerBadge = await PartnerBadge.find({ name: req.body.name, isDelete: false });
            if (partnerBadge && partnerBadge.length > 0) {
                return res.status(200).json({ status: false, message: `Badge name must be unique.` });
            }
        }

        const updatedBadge = await PartnerBadge.findByIdAndUpdate(req.params.id,
            {
                name: req.body.name ?? getPartnerBadge.name,
                badgeColor: req.body.badgeColor ?? getPartnerBadge.badgeColor,
            },
            { new: true }
        );

        if (updatedBadge)
            return res.status(200).json({ status: true, message: `Badge updated successfully!`, data: updatedBadge, });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while updating Badge!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete partner Badge
exports.deletePartnerBadge = async (req, res) => {
    try {
        const getPartnerBadge = await PartnerBadge.findById(req.params.id);
        if (!getPartnerBadge)
            return res.status(200).json({ status: false, message: `Partner Badge not found` });

        const alreadyAssignPartner = await Partner.find({ partnerType: { $eq: new ObjectId(req.params.id) }, isDelete: false }, { _id: 1, companyName: 1 }).lean();
        if (alreadyAssignPartner && alreadyAssignPartner.length > 0) {
            var partnerList = [];
            if (alreadyAssignPartner.length > 0) {
                alreadyAssignPartner.map((itemPartner, i) => {
                    partnerList.push(itemPartner.companyName);
                });
            }
            return res.status(200).json({ status: false, message: "You cannot delete this badge because it is assigned to following partners: ", data: { partnerList } });
        } else {
            const deletePartnerBadge = await PartnerBadge.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
            if (deletePartnerBadge) {
                const ids = await PartnerBadge.find({ isDelete: false }, { _id: 1 }).sort({ order: 1 });
                let resOrder = ids.map(async (item, i) => {
                    await PartnerBadge.findByIdAndUpdate(ObjectId(item), { order: i + 1 }, { new: true })
                });
                await Promise.all([...resOrder]);
                return res.status(200).json({ status: true, message: `Partner Badge deleted successfully!`, data: deletePartnerBadge });
            } else {
                return res.status(200).json({ status: false, message: `Something went wrong while deleting partner Badge!`, });
            }
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all partner post Badge
exports.getAllPartnerBadge = async (req, res) => {
    try {
        // const partnerBadgeList = await PartnerBadge.find({ isDelete: false }).sort({ order: 1 });

        const partnerBadgeList = await PartnerBadge.aggregate([
            { $sort: { order: 1 } },
            {
                $match: {
                    isDelete: false,
                    name: { $ne: "nobadge" },
                },
            },
            {
                $lookup: {
                    from: "partners",
                    let: { local_id: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $eq: ['$$local_id', '$partnerType']
                                },
                                isDelete: false,
                                isMDSPartner: true
                            },
                        }

                    ],
                    as: 'partnerData',
                }
            },
            {
                $project: {
                    _id: 1,
                    name: 1,
                    order: 1,
                    countPartnerData: { $cond: { if: { $isArray: "$partnerData" }, then: { $size: "$partnerData" }, else: "NA" } },
                    badgeColor: 1,
                    // "partnerData": { _id: 1, partnerType: 1,companyName:1,isDelete:1, isMDSPartner:1},
                }
            }
        ])

        if (partnerBadgeList)
            return res.status(200).json({ status: true, message: `Partner Badge list retrive sucessfully.`, data: partnerBadgeList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting partner Badge list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// partner Badge detail api
exports.getPartnerBadgeById = async (req, res) => {
    try {
        const partnerBadgeDetail = await PartnerBadge.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (partnerBadgeDetail)
            return res.status(200).json({ status: true, message: `Partner Badge detail retrive sucessfully.`, data: partnerBadgeDetail });
        else
            return res.status(200).json({ status: false, message: `No data found for this Badge id!` });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get event packege reorder API
exports.badgesReorder = async (req, res) => {
    try {
        const ids = req.body.ids;
        if (ids.length > 0) {
            let resOrder = ids.map(async (item, i) => {
                await PartnerBadge.findByIdAndUpdate(ObjectId(item), { order: i + 1 }, { new: true });
            });
            await Promise.all([...resOrder]);

            return res.status(200).json({ status: true, message: "Badges list rearrange succesfully!", });
        } else {
            return res.status(200).json({ status: false, message: "Something went wrong while rearrange badges!", });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: "Something went wrong!", error: error });
    }
};

// all partner Badge List by their Id and Name
exports.getAllPartnerBadgeList = async (req, res) => {
    try {
        const partnerBadgeList = await PartnerBadge.find({ isDelete: false }).sort({ order: 1 }).select({ name: 1, badgeColor: 1, });
        if (partnerBadgeList)
            return res.status(200).json({ status: true, message: `Partner Badge list retrive sucessfully.`, data: partnerBadgeList });
        else
            return res.status(200).json({ status: false, message: `Something went wrong while getting partner Badge list!`, });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// clone partner API
exports.clonePartner = async (req, res) => {
    try {
        const { partnerId } = req.body;
        if (partnerId !== undefined && partnerId !== null && partnerId !== "") {

            const objData = await Partner.findOne({
                _id: partnerId,
                isDelete: false,
            }).select("-_id -__v -updatedAt -createdAt");

            if (!objData) {
                return res.status(200).json({ status: false, message: "Partner data not Found!" });
            }

            let obj = objData.toObject();
            if (objData.companyLogo) {
                const split = objData.companyLogo.split("-logo-");
                const params1 = {
                    Bucket: process.env.AWS_BUCKET,
                    CopySource: objData.companyLogo,
                    Key: "uploads/partner/copy-" + Date.now() + "-" + split[split.length - 1],
                    ACL: "public-read",
                };
                await s3.copyObject(params1).promise();
                obj.companyLogo = process.env.AWS_IMG_VID_PATH + params1.Key;
            }

            if (objData.webBanner) {
                const split = objData.webBanner.split("-web-");
                const params2 = {
                    Bucket: process.env.AWS_BUCKET,
                    CopySource: objData.webBanner,
                    Key: "uploads/partner/copy-" + Date.now() + "-" + split[split.length - 1],
                    ACL: "public-read",
                };
                await s3.copyObject(params2).promise();
                obj.webBanner = process.env.AWS_IMG_VID_PATH + params2.Key;
            }

            if (objData.thumbnail) {
                const split = objData.thumbnail.split("-thumb-");
                const params3 = {
                    Bucket: process.env.AWS_BUCKET,
                    CopySource: objData.thumbnail,
                    Key: "uploads/partner/copy-" + Date.now() + "-" + split[split.length - 1],
                    ACL: "public-read",
                };
                await s3.copyObject(params3).promise();
                obj.thumbnail = process.env.AWS_IMG_VID_PATH + params3.Key;
            }

            if (objData.mobileBanner) {
                const split = objData.mobileBanner.split("-mobile-");
                const params4 = {
                    Bucket: process.env.AWS_BUCKET,
                    CopySource: objData.mobileBanner,
                    Key: "uploads/partner/copy-" + Date.now() + "-" + split[split.length - 1],
                    ACL: "public-read",
                };
                await s3.copyObject(params4).promise();
                obj.mobileBanner = process.env.AWS_IMG_VID_PATH + params4.Key;
            }

            obj.companyName = "Copy - " + obj.companyName;
            obj.pageView = 0;
            obj.claims = 0;
            obj.rating = 0;
            obj.userViews = [];
            obj.userOfferViews = [];

            const partnerClone = new Partner(obj);
            const newPartner = await partnerClone.save();

            return res.status(200).json({ status: true, message: "Cloning completed successfully!", data: newPartner, });
        } else {
            return res.status(200).json({ status: false, message: "Partner data not found!", data: [], });
        }

    } catch (error) {
        console.log(error, "error")
        return res.status(200).json({ status: false, message: "Internal server error!", error: error });
    }
};

// add search history of partner
exports.addPartnerSearchHistory = async (req, res) => {
    try {
        const { search, type } = req.body;
        var result = [];
        const authUser = req.authUserId;
        const userData = await User.findById(authUser).select("_id").lean();

        const checkname = await partnerSearch.find({ name: search, type: type, userId: userData._id },);
        if (checkname && checkname.length > 0) {
            result = await partnerSearch.findOneAndUpdate(
                { name: search, type: type, userId: userData._id },
                { name: search, type: type, userId: userData._id },
                { new: true }
            );
        } else {
            const newSearchPartner = new partnerSearch({ name: search, type: type, userId: userData._id },);
            result = await newSearchPartner.save();
        }
        return res.status(200).json({ status: true, message: `Search partner history added.`, data: result });
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error ${error}!` });
    }
};

// remove search history of partner
exports.removePartnerSearchHistory = async (req, res) => {
    try {
        const Data = await partnerSearch.findById(new ObjectId(req.params.id));
        if (Data) {
            const result = await partnerSearch.findOneAndDelete(
                { _id: new ObjectId(req.params.id) },
                { new: true }
            );
            return res.status(200).json({ status: true, message: `Search partner history removed successfully.`, data: result, });
        } else {
            return res.status(404).json({ status: false, message: `Search partner history not found!`, data: [], });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error ${error}!` });
    }
};

// get top 10 search history of partner by user
exports.topPartnerSearchHistory = async (req, res) => {
    try {
        const authUser = req.authUserId;
        var match = { userId: authUser }
        var filter = "";
        if (req.query.filter) {
            filter = req.query.filter;
            match = {
                ...match,
                type: { $eq: filter },
            };
        }

        const data = await partnerSearch.aggregate([
            { $match: match },
            { $sort: { updatedAt: -1 } },
            {
                $project: {
                    __v: 0,
                    createdAt: 0,
                }
            }
        ]);

        if (data.length > 0) {
            return res.status(200).json({ status: true, message: `Search history retrive successfully.`, data: data, });
        } else {
            return res.status(200).json({ status: false, message: `Partner list not found!`, data: [], });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(500).json({ status: false, message: `Internal server error ${error}!` });
    }
};

// get all partner list
exports.allPartnerList = async (req, res) => {
    try {
        var match = {
            isDelete: false,
            status: "published",
        }

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
                $project: {
                    _id: 1,
                    companyName: 1,
                }
            }
        ]);

        if (data.length > 0) {
            return res.status(200).json({ status: true, message: `Partner retrive successfully.`, data: data, });
        } else {
            return res.status(200).json({ status: false, message: `Partner list not found!`, data: [], });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `Something went wrong. ${error}` });
    }
};