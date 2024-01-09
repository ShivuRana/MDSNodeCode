const { ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const postModel = require("../../database/models/adminPost");
const AWS = require("aws-sdk");

var s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
    Bucket: process.env.AWS_BUCKET,
});

/*Create Post*/
exports.createPost = async (req, res) => {
    try {
        const { title, name, url, date } = req.body;
        const postData = { title: title, name: name, url: url, date: date }
        const post = new postModel(postData)
        const resPost = await post.save();
        return res.status(200).json({ status: true, message: `Post saved successfully!`, postData: resPost });
    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

/*Edit Post*/
exports.editPost = async (req, res) => {
    try {
        const { title, name, url, date } = req.body;
        const post = await postModel.findOne({ _id: ObjectId(req.params.id), isDelete: false })
        if (!post) {
            return res.status(200).json({ status: false, message: `Post not found!` });
        } else {
            const postData = {
                title: title ?? post.title,
                name: name ?? post.name,
                url: url ?? post.url,
                date: date ?? post.date,
            }
            const resPost = await postModel.findByIdAndUpdate(ObjectId(req.params.id), postData, { new: true })
            return res.status(200).json({ status: true, message: `Post updated successfully`, postData: resPost });
        }

    } catch (error) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// delete Post
exports.deletePost = async (req, res) => {
    try {
        const getPost = await postModel.findOne({ _id: new ObjectId(req.params.id), isDelete: false }).lean();
        if (getPost) {
            const postData = await postModel.findByIdAndUpdate(req.params.id, { isDelete: true }, { new: true });
            if (postData)
                return res.status(200).json({ status: true, message: "Post deleted successfully!", data: postData });
            else
                return res.status(200).json({ status: false, message: "something went wrong while deleteing Post!", });
        } else {
            return res.status(200).json({ status: false, message: "Post not found!" });
        }
    } catch (e) {
        return res.status(500).json({ status: false, message: "internal server error!", error: e });
    }
};

// get all Post
exports.getAllPost = async (req, res) => {
    try {

        var match = {
            isDelete: false,
        };

        var search = "";
        if (req.query.search) {
            search = req.query.search;
            match = {
                ...match,
                $or: [
                    { title: { $regex: ".*" + search + ".*", $options: "i" }, },
                    { name: { $regex: ".*" + search + ".*", $options: "i" }, },
                ]
            };
        }

        const allPostData = await postModel.find(match).sort({ createdAt: -1 });
        if (allPostData)
            return res.status(200).json({ status: true, message: "All Post retrieved!", data: allPostData });
        else
            return res.status(200).json({ status: false, message: "something went wrong while getting Post!", });
    } catch (e) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get all Post
exports.getPostDetail = async (req, res) => {
    try {

        const id = req.params.id
        const postData = await postModel.findOne({ _id: ObjectId(id), isDelete: false });
        if (postData)
            return res.status(200).json({ status: true, message: "Post details retrieved!", data: postData });
        else
            return res.status(200).json({ status: false, message: "something went wrong while getting Post!", });
    } catch (e) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};

// get all Post for users
exports.getAllPostUsers = async (req, res) => {
    try {
        const allPostData = await postModel.find({ isDelete: false });
        if (allPostData)
            return res.status(200).json({ status: true, message: "All Post retrieved!", data: allPostData });
        else
            return res.status(200).json({ status: false, message: "something went wrong while getting Post!", });
    } catch (e) {
        return res.status(200).json({ status: false, message: `${error.message}` });
    }
};