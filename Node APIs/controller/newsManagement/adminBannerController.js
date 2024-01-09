const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const bannerModel = require("../../database/models/adminBanner");
const AWS = require("aws-sdk");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

/*Create Banner*/
exports.createBanner = async (req, res) => {
    try {
        const { bannerUrl, publicationStartDate, publicationStartTime, publicationEndDate, publicationEndTime, saveAs, } = req.body;
        const BannerData = {
            bannerImage: req.bannerImage,
            webBannerImage: req.webBannerImage,
            bannerUrl: bannerUrl,
            publicationStartDate: publicationStartDate,
            publicationStartTime: publicationStartTime,
            publicationEndDate: publicationEndDate,
            publicationEndTime: publicationEndTime,
            saveAs: saveAs
        }
        const banner = new bannerModel(BannerData);
        const resBanner = await banner.save();
        return res.status(200).json({ status: true, message: `Banner saved successfully!`, bannerData: resBanner });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

/*Edit Banner*/
exports.editBanner = async (req, res) => {
    try {
        const { bannerUrl, publicationStartDate, publicationEndDate, publicationStartTime, publicationEndTime, saveAs, } = req.body;
        const banner = await bannerModel.findOne({ _id: ObjectId(req.params.id), isDelete: false })
        if (!banner) {
            return res.status(200).json({ status: false, message: `Banner not found!` });
        } else {
            const bannerData = {
                bannerImage: req.bannerImage ?? banner.bannerImage,
                webBannerImage: req.webBannerImage ?? banner.webBannerImage,
                bannerUrl: bannerUrl ?? banner.bannerUrl,
                publicationStartDate: publicationStartDate ?? banner.publicationStartDate,
                publicationEndDate: publicationEndDate ?? banner.publicationEndDate,
                publicationStartTime: publicationStartTime ?? banner.publicationStartTime,
                publicationEndTime: publicationEndTime ?? banner.publicationEndTime,
                saveAs: saveAs ?? banner.saveAs
            }
            const resBanner = await bannerModel.findByIdAndUpdate(ObjectId(req.params.id), bannerData,
                { new: true })
            return res.status(200).json({ status: true, message: `Banner updated successfully`, bannerData: resBanner });
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// Delete Banner
exports.deleteBanner = async (req, res) => {
    try {
        const getBanner = await bannerModel.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        if (getBanner) {
            const bannerData = await bannerModel.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
            if (bannerData)
                return res.status(200).json({ status: true, message: "Banner deleted successfully!", data: bannerData });
            else
                return res.status(200).json({ status: false, message: "something went wrong while deleteing Banner!", });
        } else {
            return res.status(200).json({ status: false, message: "Banner not found!" });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: "internal server error!", error: e });
    }
};

// Get all Banner
exports.getAllBanner = async (req, res) => {
    try {
        const allBannerData = await bannerModel.find({ isDelete: false }).sort({ createdAt: -1 });
        if (allBannerData)
            return res.status(200).json({ status: true, message: "All Banner retrieved!", data: allBannerData });
        else
            return res.status(200).json({ status: false, message: "something went wrong while getting Banner!", });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// Get Banner Detail
exports.getBannerDetail = async (req, res) => {
    try {
        const id = req.params.id
        const bannerData = await bannerModel.findOne({ _id: ObjectId(id), isDelete: false });
        if (bannerData)
            return res.status(200).json({ status: true, message: "Banner details retrieved!", data: bannerData });
        else
            return res.status(200).json({ status: false, message: "something went wrong while getting Banner!", });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// Reorder Banner
exports.reorderBanner = async (req, res) => {
    try {
        const ids = req.body.ids
        if (ids.length > 0) {
            let resOrder = ids.map(async (item, i) => {
                await bannerModel.findByIdAndUpdate(ObjectId(item), { order: i + 1 }, { new: true })
            });
            await Promise.all([...resOrder]);
        }
        const reorderedBanner = await bannerModel.find({ isDelete: false }).sort({ order: 1 });
        if (reorderedBanner.length > 0)
            return res.status(200).json({ status: true, message: "Reordered banners retrieved!", data: reorderedBanner });
        else
            return res.status(200).json({ status: false, message: "Banners not found!" });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get all banners for frontend users
exports.getAllBannerUsers = async (req, res) => {
    try {
        const allBannerData = await bannerModel.find({ saveAs: "publish", isDelete: false }).sort({ order: 1 });
        if (allBannerData)
            return res.status(200).json({ status: true, message: "All Banner retrieved!", data: allBannerData });
        else
            return res.status(200).json({ status: false, message: "something went wrong while getting Banner!", });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

