const accessResource = require("../../database/models/collaborator/accessResource");
const User = require("../../database/models/airTableSync");
const ObjectId = require("mongoose").Types.ObjectId;

const AWS = require("aws-sdk");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

// create access resource
exports.createAccessResource = async (req, res) => {
    try {
        const resourceExist = await accessResource.find({ name: req.body.name, isDelete: false });

        if (resourceExist && resourceExist.length > 0) {
            return res.status(200).json({ status: false, message: `Resource name must be unique!` });
        }

        const newAccessResource = new accessResource({ name: req.body.name });
        const saveResource = await newAccessResource.save();
        if (saveResource) {
            return res.status(200).json({ status: true, message: `Resource created successfully.`, data: saveResource, });
        } else {
            return res.status(401).json({ status: false, message: `Something went wrong while adding resource!`, });
        }
    } catch (error) {
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// all access resource
exports.getAllAccessResource = async (req, res) => {
    try {
        const accessResourceList = await accessResource.find({ isDelete: false });

        if (accessResourceList)
            return res.status(200).json({ status: true, message: `Resource list retrive sucessfully.`, data: accessResourceList });
        else
            return res.status(401).json({ status: false, message: `Something went wrong while getting resource list!`, });
    } catch (error) {
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};

// access resource detail
exports.getAccessResourceById = async (req, res) => {
    try {
        const accessResourceDetail = await accessResource.findOne({ _id: new ObjectId(req.params.id), isDelete: false });
        if (accessResourceDetail) {
            return res.status(200).json({ status: true, message: `Resource detail retrive sucessfully.`, data: accessResourceDetail });
        } else {
            return res.status(200).json({ status: false, message: `No data found for this resource id!` });
        }
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// all access resource for user
exports.getAllResource = async (req, res) => {
    try {
        const accessResourceList = await accessResource.find({ isDelete: false });

        if (accessResourceList)
            return res.status(200).json({ status: true, message: `Resource list retrive sucessfully.`, data: accessResourceList });
        else
            return res.status(401).json({ status: false, message: `Something went wrong while getting resource list!`, });
    } catch (error) {
        return res.status(500).json({ status: false, message: `${error.message}` });
    }
};