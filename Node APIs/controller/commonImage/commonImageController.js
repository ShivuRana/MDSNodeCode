const commonImage = require("../../database/models/commonImage/commonImage");
const event = require("../../database/models/event");
const { ObjectId } = require("mongodb");
const moment = require("moment");
require('moment-timezone');
const AWS = require("aws-sdk");
const bucketName = process.env.AWS_BUCKET;
const folderName = `uploads/common-image/`;
const domainName = `https://mds-community.s3.amazonaws.com/uploads/common-image/`

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// upload all common images on aws server
exports.uploadCommonImages = async (req, res) => {
    try {
        const { image } = req;
        if (image) {
            var data = [];
            let multiPhotos = image?.map(async (singleImg) => {
                data.push({ url: singleImg });
            });

            var updateEntry = [];
            for (let index = 0; index < data.length; index++) {
                const newImages = new commonImage(data[index]);
                const result = await newImages.save();
                updateEntry.push(result);
            }
            await Promise.all([...multiPhotos]);

            if (updateEntry.length > 0) {
                return res.status(200).json({ status: true, message: "Common images uploaded successfully." });
            } else
                return res.status(200).json({ status: false, message: "Something went wrong while adding more images!" });
        } else {
            return res.status(200).json({ status: false, message: "Common images not found!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: "Internal server error!", error: error });
    }
};

// get common images from the S3 bucket
async function getImageUrlsFromS3Folder(bucket, folder) {
    const params = {
        Bucket: bucket,
        Prefix: folder,
    };
    try {
        const response = await s3.listObjectsV2(params).promise();
        const imageUrls = response.Contents.map(
            (item) => `https://${bucket}.s3.amazonaws.com/${item.Key}`
        );
        return imageUrls;
    } catch (err) {
        console.error('Error fetching image URLs from S3:', err);
        return [];
    }
}

// get all common uploaded images
exports.getAllCommonImages = async (req, res) => {
    try {
        getImageUrlsFromS3Folder(bucketName, folderName).then((imageUrls) => {
            if (imageUrls.length > 0) {
                imageUrls = imageUrls.filter(e => e !== domainName);
                return res.status(200).json({ status: true, message: "All common images retrive successfully.", data: imageUrls, });
            } else {
                return res.status(200).json({ status: false, message: "No existing common images found!", data: [] });
            }
        }).catch((err) => {
            console.error('Error:', err);
            return res.status(200).json({ status: false, message: "Internal server error!", error: err });
        });
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: "Internal server error!", error: error });
    }
};

// delete common images from admin
exports.deleteCommonImages = async (req, res) => {
    try {
        const { imagesIds } = req.body;
        if (imagesIds.length > 0) {
            let multiPhotos = imagesIds?.map(async (imageUrl) => {
                const getImage = await commonImage.findOne({ url: imageUrl, isDelete: false }).lean();

                await event.updateMany({ isDelete: false }, {
                    $pull: { photos: imageUrl },
                }, { new: true });

                let splitUrl = getImage.url.split("com/");
                await s3.deleteObject({
                    Bucket: process.env.AWS_BUCKET,
                    Key: splitUrl[1],
                }).promise();
                await commonImage.findOneAndUpdate({ _id: getImage._id, isDelete: false }, { isDelete: true }, { new: true });
            });
            await Promise.all([...multiPhotos]);

            if (imagesIds.length > 0) {
                return res.status(200).json({ status: true, message: "Photos deleted successfully." });
            } else {
                return res.status(200).json({ status: false, message: "Something went wrong while deleteding photo!" });
            }
        } else {
            return res.status(200).json({ status: false, message: "Photo data not found!" });
        }
    } catch (error) {
        console.log(error, "error");
        return res.status(200).json({ status: false, message: "Internal server error!", error: error });
    }
};