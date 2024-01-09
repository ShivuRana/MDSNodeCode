const sharp = require("sharp");
require("dotenv").config();
const AWS = require("aws-sdk");
const { v4: uuidv4 } = require("uuid");
const fs = require('fs');
const { getVideoDurationInSeconds } = require("get-video-duration");

const { dummyFile, uploadMediaFiles, uploadMediaFilesforGrp, uploadMediaFilesforTpc, multiMediaForQuestions_onSignup, userProfileImage, groupFile, mediaFor_QnA, contentMedia, chatFile, uploadMediaforChatGrp, userbulkjson, LargeFile, speakerPhoto, ActivityIcon, eventThumbnail, eventImages, eventGallery, bannerImages,partnerBannerImages, newsThumbnail, newsImages, channelIcon, locationImages, PartnerIcon, helpfulLinkIcon, videoCategoryImage, commonImage } = require("./upload");

const { checkGroup_userCanAccessResource, } = require("../middleware/resourceAccess");
const { resolve } = require("path");
const { rejects } = require("assert");

const s3 = new AWS.S3({
    accessKeyId: process.env.AWS_ID,
    secretAccessKey: process.env.AWS_SECRET,
});

const uploadSignUPQuestionMedia = async (req, res, next) => {
    multiMediaForQuestions_onSignup(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
            return res.status(200).json({ status: false, message: "Something wrong with files." });
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadforQnA = async (req, res, next) => {
    mediaFor_QnA(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M", });
            }
            return res.status(200).json({ status: false, message: "Something wrong with files." });
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadQuestionsMediaToS3 = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [];
    var questions_file = [];

    if (files && files.length > 0) {
        multi_files_promise = files.map(async (file) => {
            var upload_s3 = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key:
                    "uploads/users/questionsMedia/" +
                    Date.now() +
                    "-" +
                    file.originalname,
                Body: file.buffer,
                ACL: "public-read",
            }).promise();

            questions_file.push(upload_s3.Key);
        });
    }
    await Promise.all([...multi_files_promise]);
    req.questions_file = questions_file;
    next();
};

const uploadmedia = async (req, res, next) => {
    uploadMediaFiles(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            } else if (error.code == "LIMIT_UNEXPECTED_FILE") {
                return res.status(200).json({ status: false, message: "Invalid file type. Only jpg, jpeg, png image files are allowed and gif, mp4 and mov allowed for video files.", error, });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const resizeImages = async (req, res, next) => {
    await checkGroup_userCanAccessResource(
        req.authUserId,
        req.body.groupId,
        req.body.user_type
    ).then(async (val) => {
        const thumb_images = [];
        const medium_images = [];
        const original_images = [];
        const video_s3 = [];
        var resizePromises = [];
        var videospromise = [];

        if (req.files.images && req.files.images.length > 0) {
            resizePromises = req.files.images.map(async (file) => {
                var random_id = uuidv4();
                // resize for thumbnail image
                const thumbnailsImg = await sharp(file.buffer)
                    .resize({ width: 150, height: 150 })
                    .toBuffer()
                    .then((buffer) =>
                        s3.upload({
                            Bucket: process.env.AWS_BUCKET,
                            Key: "uploads/post/images/thumbnails/" + random_id + "_" + Date.now() + "-" + file.originalname,
                            Body: buffer,
                            ACL: "public-read",
                        }).promise()
                    );
                thumb_images.push(thumbnailsImg.Key);

                // resize for medium image
                const mediumImg = await sharp(file.buffer)
                    .resize({ width: 300, height: 300 })
                    .toBuffer()
                    .then((buffer) =>
                        s3.upload({
                            Bucket: process.env.AWS_BUCKET,
                            Key: "uploads/post/images/medium/" + random_id + "_" + Date.now() + "-" + file.originalname,
                            Body: buffer,
                            ACL: "public-read",
                        }).promise()
                    );
                medium_images.push(mediumImg.Key);

                // original image
                const originalImg = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/post/images/original/" + random_id + "_" + Date.now() + "-" + file.originalname,
                    Body: file.buffer,
                    ACL: "public-read",
                }).promise();

                original_images.push(originalImg.Key);
            });
        }
        if (req.files.videos && req.files.videos.length > 0) {
            videospromise = req.files.videos.map(async (video) => {
                var random_id = uuidv4();
                const videofile = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/post/videos/" + random_id + "_" + Date.now() + "-" + video.originalname,
                    Body: video.buffer,
                    ACL: "public-read",
                }).promise();

                video_s3.push(videofile.Key);
            });
        }
        await Promise.all([...resizePromises, ...videospromise]);

        req.thumb_images = thumb_images;
        req.medium_images = medium_images;
        req.original_images = original_images;
        req.upload_videos = video_s3;

        next();
    }).catch((err) => {
        return res.status(200).json({ status: false, message: `${err}` });
    });
};

const groupUploads = async (req, res, next) => {
    uploadMediaFilesforGrp(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            } else if (error.code == "LIMIT_UNEXPECTED_FILE") {
                return res.status(200).json({ status: false, message: "Allow only one image.", error });
            } else if (!error.status) {
                return res.status(200).json({ status: false, message: error.message });
            }
        }
        next();
    });
};

const uploadGrpImgToS3Bucket = async (req, res, next) => {
    const files = req.files;

    var group_image = "";
    var cover_image = "";

    if (req.files !== undefined && req.files.groupImage && req.files.groupImage.length > 0) {
        var groupImage = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/group/images/thumb-" + Date.now() + "-" + files.groupImage[0].originalname,
            Body: files.groupImage[0].buffer,
            ACL: "public-read",
        }).promise();

        group_image = groupImage.Key;
    }
    if (req.files !== undefined && req.files.groupCoverImage && req.files.groupCoverImage.length > 0) {
        var coverImg = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/group/images/cover-" + Date.now() + "-" + files.groupCoverImage[0].originalname,
            Body: files.groupCoverImage[0].buffer,
            ACL: "public-read",
        }).promise();

        cover_image = coverImg.Key;
    }
    req.group_image = group_image;
    req.cover_image = cover_image;
    next();
};

const uploadGroupFile = async (req, res, next) => {
    groupFile(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
            return res.status(200).json({ status: false, message: "Invalid file type only pdf, txt, doc, csv, xls files are allowed.", error, });
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadGroupFilesToS3 = async (req, res, next) => {
    const files = req.files;

    var multi_files_promise = [];
    var files_g = [];

    if (files && files.length > 0) {
        multi_files_promise = files.map(async (file) => {
            var upload_s3 = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/group/files/" + Date.now() + "-" + file.originalname,
                Body: file.buffer,
                ACL: "public-read",
            }).promise();

            files_g.push(upload_s3.Key);
        });
    }
    await Promise.all([...multi_files_promise]);
    req.files_g = files_g;
    next();
};

const topicUpload = async (req, res, next) => {
    uploadMediaFilesforTpc(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            } else if (error.code == "LIMIT_UNEXPECTED_FILE") {
                return res.status(200).json({ status: false, message: "Allow only one image.", error });
            } else if (!error.status) {
                return res.status(200).json({ status: false, message: error.message });
            }
        }
        next();
    });
};

const uploadTpcImgToS3Bucket = async (req, res, next) => {
    const files = req.files;

    var topic_image = "";

    if (req.files.topicImage && req.files.topicImage.length > 0) {
        var topicImage = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/topic/images/thumb-" + Date.now() + "-" + files.topicImage[0].originalname,
            Body: files.topicImage[0].buffer,
            ACL: "public-read",
        })
            .promise();
        topic_image = topicImage.Key;
    }
    req.topic_image = topic_image;
    next();
};

const userProfileImageUpload = async (req, res, next) => {
    userProfileImage(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            } else if (error.code == "LIMIT_UNEXPECTED_FILE") {
                return res.status(200).json({ status: false, message: "Allow only one image.", error });
            } else if (!error.status) {
                return res.status(200).json({ status: false, message: error.message });
            }
        }
        next();
    });
};

const uploadprofileImgToS3Bucket = async (req, res, next) => {
    const files = req.files;

    if (files !== undefined && files.profileImg && files.profileImg.length > 0) {
        const thumbnailImg = await sharp(files.profileImg[0].buffer)
            .resize({ width: 150, height: 150 })
            .toBuffer()
            .then((buffer) =>
                s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/users/profile/thumb-" + req.authUserId + "-" + files.profileImg[0].originalname,
                    Body: buffer,
                    ACL: "public-read",
                }).promise()
            );

        req.thum_profile = thumbnailImg.Key;

        var profileImage = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/users/profile/original-" + req.authUserId + "-" + files.profileImg[0].originalname,
            Body: files.profileImg[0].buffer,
            ACL: "public-read",
        }).promise();
        req.origi_profile = process.env.AWS_IMG_VID_PATH + profileImage.Key;
    } else {
        req.origi_profile = ""
    }
    if (files !== undefined && files.profileCover && files.profileCover.length > 0) {
        var coverImg = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/users/profile/cover-" + req.authUserId + "-" + files.profileCover[0].originalname,
            Body: files.profileCover[0].buffer,
            ACL: "public-read",
        }).promise();
        req.cover_img = coverImg.Key;
    } else {
        req.cover_img = "";
    }

    next();
};

const uploadUserprofileImgToS3Bucket = async (req, res, next) => {
    const files = req.files;

    if (files && files.profileImg && files.profileImg.length > 0) {
        const thumbnailImg = await sharp(files.profileImg[0].buffer)
            .resize({ width: 150, height: 150 })
            .toBuffer()
            .then((buffer) =>
                s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/users/profile/thumb-" + req.body.userId + "-" + files.profileImg[0].originalname,
                    Body: buffer,
                    ACL: "public-read",
                }).promise()
            );

        req.thum_profile = thumbnailImg.Key;

        var profileImage = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/users/profile/original-" + req.body.userId + "-" + files.profileImg[0].originalname,
            Body: files.profileImg[0].buffer,
            ACL: "public-read",
        }).promise();
        req.origi_profile = process.env.AWS_IMG_VID_PATH + profileImage.Key;
    }

    if (files && files.profileCover && files.profileCover.length > 0) {
        var coverImg = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/users/profile/cover-" + req.body.userId + "-" + files.profileCover[0].originalname,
            Body: files.profileCover[0].buffer,
            ACL: "public-read",
        }).promise();
        req.cover_img = coverImg.Key;
    }

    if (files !== undefined && files.speakerIcon && files.speakerIcon.length > 0) {
        var speakerPic = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/users/profile/speakerIcon-" + files.speakerIcon[0].originalname.replace(/ /g, "_"),
            Body: files.speakerIcon[0].buffer,
            ACL: "public-read",
        }).promise();
        req.speakerIcon = process.env.AWS_IMG_VID_PATH + speakerPic.Key;
    }

    if (files !== undefined && files.guestIcon && files.guestIcon.length > 0) {
        var guestPic = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/users/profile/guestIcon-" + files.guestIcon[0].originalname.replace(/ /g, "_"),
            Body: files.guestIcon[0].buffer,
            ACL: "public-read",
        }).promise();
        req.guestIcon = process.env.AWS_IMG_VID_PATH + guestPic.Key;
    }

    if (files !== undefined && files.partnerIcon && files.partnerIcon.length > 0) {
        var partnerPic = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/users/profile/partnerIcon-" + files.partnerIcon[0].originalname.replace(/ /g, "_"),
            Body: files.partnerIcon[0].buffer,
            ACL: "public-read",
        }).promise();
        req.partnerIcon = process.env.AWS_IMG_VID_PATH + partnerPic.Key;
    }
    next();
};

const uploadContentMedia = async (req, res, next) => {
    contentMedia(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_UNEXPECTED_FILE") {
                return res.status(200).json({ status: false, message: "Not valid file format.", error });
            } else if (!error.status) {
                return res.status(200).json({ status: false, message: error.message });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadcontentMediaToS3Bucket = async (req, res, next) => {
    const files = req.files;
    if (files.length > 0) {
        let files_arr = [];
        let partners_arr = [];
        let upt_partner_arr = [];
        let upt_files_arr = [];
        const promise_t = files.map(async (file) => {
            if (file.fieldname === "thumbnail") {
                var st_thumbnail = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/content-archive/thumbnail/" + Date.now() + "-" + file.originalname.replace(/ /g, "_"),
                    Body: file.buffer,
                    ACL: "public-read",
                }).promise();
                req.thumbnail = st_thumbnail.Key;

            } else if (file.fieldname === "c_video") {
                const max_fileSize = 2000000000;
                if (file.size > max_fileSize)
                    return res.status(200).json({ status: false, message: `${file.originalname} file size is bigger then 1070MB.`, });
                var video_file = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/content-archive/videos/" + Date.now() + "-" + file.originalname.replace(/ /g, "_"),
                    Body: file.buffer,
                    ACL: "public-read",
                }).promise();
                req.video_v = video_file.Key;

            } else if (/^c_files?/.test(file.fieldname)) {
                var file_res = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/content-archive/files/" + Date.now() + "-" + file.originalname.replace(/ /g, "_"),
                    Body: file.buffer,
                    ACL: "public-read",
                }).promise();
                files_arr.push(file_res.Key);

            } else if (/^update_file?/.test(file.fieldname)) {
                var upt_file_res = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/content-archive/files/" + Date.now() + "-" + file.originalname.replace(/ /g, "_"),
                    Body: file.buffer,
                    ACL: "public-read",
                }).promise();

                upt_files_arr.push(upt_file_res.Key);

            } else if (/^partners?/.test(file.fieldname)) {
                var prt_res = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/content-archive/partners/" + Date.now() + "-" + file.originalname.replace(/ /g, "_"),
                    Body: file.buffer,
                    ACL: "public-read",
                }).promise();

                partners_arr.push(prt_res.Key);

            } else if (/^update_partner?/.test(file.fieldname)) {
                var upt_prt_res = await s3.upload({
                    Bucket: process.env.AWS_BUCKET,
                    Key: "uploads/content-archive/partners/" + Date.now() + "-" + file.originalname.replace(/ /g, "_"),
                    Body: file.buffer,
                    ACL: "public-read",
                }).promise();

                upt_partner_arr.push(upt_prt_res.Key);
            }
        });
        await Promise.all([...promise_t]);

        req.files_v = files_arr;
        req.partners_v = partners_arr;
        req.upt_partners_v = upt_partner_arr;
        req.upt_files_v = upt_files_arr;
    }
    next();
};

const deleteImage = async function (filePath) {
    let params = {
        Bucket: process.env.AWS_BUCKET,
        Key: filePath,
    };
    await s3.deleteObject(params).promise();
};

const uploadChatFile = async (req, res, next) => {
    chatFile(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadChatFileToS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [],
        otherfiles_promise = [];
    var files_chat = [],
        otherfiles_chat = [];
    if (files.media && files.media.length > 0) {
        multi_files_promise = files.media.map(async (img_vid) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/chat/media/" + random_id + "_" + Date.now() + "-GRPCHATUNIQUE-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            files_chat.push({ key: file.Key, size: img_vid.size });
        });
    }

    if (files.otherfiles && files.otherfiles.length > 0) {
        otherfiles_promise = files.otherfiles.map(async (otherfile) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/chat/media/" + random_id + "_" + Date.now() + "-GRPCHATUNIQUE-" + otherfile.originalname.replace(/\s/g, "_"),
                Body: otherfile.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + otherfile.originalname.replace(/\s/g, "_"),
            }).promise();

            otherfiles_chat.push({ key: file.Key, size: otherfile.size });
        });
    }
    await Promise.all([...multi_files_promise, ...otherfiles_promise]);

    req.files_chat = files_chat;
    req.otherfiles_chat = otherfiles_chat;

    next();
};

const uploadGroupChatFileToS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [],
        otherfiles_promise = [];
    var files_chat = [],
        otherfiles_chat = [];
    if (files.media && files.media.length > 0) {
        multi_files_promise = files.media.map(async (img_vid) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/group-chat/media/" + random_id + "_" + Date.now() + "-GRPCHATUNIQUE-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
            }).promise();

            files_chat.push({ key: file.Key, size: img_vid.size });
        });
    }

    if (files.otherfiles && files.otherfiles.length > 0) {
        otherfiles_promise = files.otherfiles.map(async (otherfile) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/group-chat/media/" + random_id + "_" + Date.now() + "-GRPCHATUNIQUE-" + otherfile.originalname.replace(/\s/g, "_"),
                Body: otherfile.buffer,
                ACL: "public-read",
            }).promise();

            otherfiles_chat.push({ key: file.Key, size: otherfile.size });
        });
    }
    await Promise.all([...multi_files_promise, ...otherfiles_promise]);

    req.files_chat = files_chat;
    req.otherfiles_chat = otherfiles_chat;

    next();
};

const chatgroupUploads = async (req, res, next) => {
    uploadMediaforChatGrp(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            } else if (error.code == "LIMIT_UNEXPECTED_FILE") {
                return res.status(200).json({ status: false, message: "Allow only one image.", error });
            } else if (!error.status) {
                return res.status(200).json({ status: false, message: error.message });
            }
        }
        next();
    });
};

const uploadChatGrpImgToS3Bucket = async (req, res, next) => {
    const files = req.files;

    var group_image = "";
    if (req.files !== undefined && req.files.group_image && req.files.group_image.length > 0) {
        var groupImage = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/group/images/thumb-" + Date.now() + "-" + files.group_image[0].originalname,
            Body: files.group_image[0].buffer,
            ACL: "public-read",
        }).promise();
        group_image = process.env.AWS_IMG_VID_PATH + groupImage.Key;
    } else {
        group_image = "";
    }

    req.group_image = group_image;

    next();
};

const uploadDummyFile = async (req, res, next) => {
    dummyFile(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        } else {
            if (!req.file) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploaddummyfileToS3Bucket = async (req, res, next) => {
    const file = req.file;
    var file_res = await s3.upload({
        Bucket: process.env.AWS_BUCKET,
        Key: "uploads/dummy/" + Date.now() + "-" + file.originalname,
        Body: file.buffer,
        ACL: "public-read",
    }).promise();
    req.dummy_file = file_res.Key;

    next();
};

const bulkfile = async (req, res, next) => {
    userbulkjson(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "File not uploading" });
        }
        req.users = req.file;
        next();
    });
};

const uploadLargeFile = async (req, res, next) => {
    LargeFile(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        } else {
            if (!req.file) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadLargefileToS3Bucket = async (req, res, next) => {
    const file = req.file;
    const fileStream = file.buffer;

    const multipartParams = {
        Bucket: process.env.AWS_BUCKET,
        Key: "uploads/" + Date.now() + "-" + file.originalname,
    };

    s3.createMultipartUpload(multipartParams, function (mpErr, multipart) {

        if (mpErr) {
            console.log('Error', mpErr);
            return;
        }

        const partSize = fileStream.length / 10; // 536MB
        let startslice = 0;
        let partNumber = 1;
        let parts = [];

        // Upload each part
        function uploadPart(partParams) {
            s3.uploadPart(partParams, function (err, data) {
                if (err) {
                    console.log('Error', err);
                    return;
                }
                // Store the uploaded part
                parts[partParams.PartNumber - 1] = {
                    ETag: data.ETag,
                    PartNumber: partParams.PartNumber,
                };

                if (partNumber < Math.ceil(req.file.size / partSize)) {
                    // Upload the next part
                    partParams.PartNumber++;
                    partParams.UploadId = multipart.UploadId;
                    partParams.Body = fileStream.slice(startslice, startslice + partSize);
                    startslice = startslice + partSize
                    uploadPart(partParams);

                } else {
                    // Complete the multipart upload
                    const completeParams = {
                        Bucket: process.env.AWS_BUCKET,
                        Key: "uploads/" + Date.now() + "-" + file.originalname,
                        MultipartUpload: {
                            Parts: parts,
                        },
                        UploadId: multipart.UploadId,
                    };

                    s3.completeMultipartUpload(completeParams, function (err, data) {
                        if (err) {
                            console.log('Error', err);
                            return;
                        }

                        req.Large_file = "uploads/" + Date.now() + "-" + file.originalname;
                        next();
                    });
                }
            });
        }

        // Upload the first part
        const partParams = {
            Body: fileStream.slice(startslice, startslice + partSize),
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/" + Date.now() + "-" + file.originalname,
            PartNumber: partNumber,
            UploadId: multipart.UploadId,
        };

        uploadPart(partParams);
    });

};

const uploadSpeakerPhoto = async (req, res, next) => {
    speakerPhoto(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadSpeakerPhotoToS3Bucket = async (req, res, next) => {
    const file = req.file;
    if (file) {
        var file_res = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/speaker/" + Date.now() + "-" + file.originalname.replace(/\s/g, "_"),
            Body: file.buffer,
            ACL: "public-read",
        }).promise();
        req.speaker_pic = file_res.Key;
    }
    next();
};

const uploadEventActivityIcon = async (req, res, next) => {
    ActivityIcon(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadEventActivityIconS3Bucket = async (req, res, next) => {
    const file = req.file;
    if (file) {
        var file_res = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: `uploads/event-activity/${process.env.AWS_ACTIVITY_ICON_FOLDER}/` + Date.now() + "-" + file.originalname.replace(/\s/g, "_"),
            Body: file.buffer,
            ACL: "public-read",
        }).promise();
        req.icon = process.env.AWS_IMG_VID_PATH + file_res.Key;
    }
    next();
};

const uploadEventThumbnail = async (req, res, next) => {
    eventThumbnail(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadEventThumbnailS3Bucket = async (req, res, next) => {
    const file = req.file;
    if (file) {
        var file_res = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/eventthumbnail/" + Date.now() + "-" + file.originalname,
            Body: file.buffer,
            ACL: "public-read",
        }).promise();
        req.thumbnail = process.env.AWS_IMG_VID_PATH + file_res.Key;
    }
    next();
};

const uploadEventImages = async (req, res, next) => {
    eventImages(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadEventImagesS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [];
    var images = [];
    if (files.image && files.image.length > 0) {
        multi_files_promise = files.image.map(async (img_vid) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/event-images/" + random_id + "_" + Date.now() + "-GRPCHATUNIQUE-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            images.push({ key: process.env.AWS_IMG_VID_PATH + file.Key, size: img_vid.size });
        });
        await Promise.all([...multi_files_promise]);
    }
    req.image = images;
    next();
};

const uploadEventGallery = async (req, res, next) => {
    eventGallery(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadEventGalleryS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [];
    var photos = [];
    if (files.photo && files.photo.length > 0) {
        multi_files_promise = files.photo.map(async (img_vid) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/event-media/" + random_id + "_" + Date.now() + "-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            photos.push(process.env.AWS_IMG_VID_PATH + file.Key);
        });
        await Promise.all([...multi_files_promise]);
    }
    req.photos = photos;
    next();
};

const uploadBannerImage = async (req, res, next) => {
    bannerImages(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadBannerImageS3Bucket = async (req, res, next) => {

    const files = req.files;
    var multi_files_promise = [];

    if (files.bannerImage && files.bannerImage.length > 0) {
        multi_files_promise = files.bannerImage.map(async (img_vid, i) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/banner/" + random_id + "_" + Date.now() + "-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();
            req.bannerImage = file.Key
        });
        await Promise.all([...multi_files_promise]);
    }

    if (files.webBannerImage && files.webBannerImage.length > 0) {
        multi_files_promise = files.webBannerImage.map(async (img_vid, i) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/banner/" + random_id + "_" + Date.now() + "-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();
            req.webBannerImage = file.Key
        });
        await Promise.all([...multi_files_promise]);
    }
    next();
};

const uploadPartnerBannerImage = async (req, res, next) => {
    partnerBannerImages(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadPartnerBannerImageS3Bucket = async (req, res, next) => {

    const files = req.files;
    var multi_files_promise = [];

    if (files.imageWeb&& files.imageWeb.length > 0) {
        multi_files_promise = files.imageWeb.map(async (img_vid, i) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/partner-banner/" + random_id + "_" + Date.now() + "-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();
            req.imageWeb = file.Key
        });
        await Promise.all([...multi_files_promise]);
    }

    if (files.imageMobile && files.imageMobile.length > 0) {
        multi_files_promise = files.imageMobile.map(async (img_vid, i) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/partner-banner/" + random_id + "_" + Date.now() + "-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();
            req.imageMobile = file.Key
        });
        await Promise.all([...multi_files_promise]);
    }
    next();
};

const uploadNewsThumbnail = async (req, res, next) => {

    newsThumbnail(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadNewsThumbnailS3Bucket = async (req, res, next) => {
    const file = req.file;
    if (file) {
        var file_res = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/news/" + Date.now() + "-" + file.originalname,
            Body: file.buffer,
            ACL: "public-read",
        }).promise();
        req.newsThumbnail = file_res.Key;
    }
    next();
};

const uploadNewsImages = async (req, res, next) => {
    newsImages(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadNewsImagesS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [];
    var images = [];
    if (files.image && files.image.length > 0) {
        multi_files_promise = files.image.map(async (img_vid) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/newsImages/" + random_id + "_" + Date.now() + "-NEWSHTMLUNIQUE-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            images.push({ key: process.env.AWS_IMG_VID_PATH + file.Key, size: img_vid.size });
        });
        await Promise.all([...multi_files_promise]);
    }
    req.image = images;
    next();
};

const uploadChannelIcon = async (req, res, next) => {

    channelIcon(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadChannelIconS3Bucket = async (req, res, next) => {
    const file = req.file;
    if (file) {
        var file_res = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/channel/" + Date.now() + "-" + file.originalname,
            Body: file.buffer,
            ACL: "public-read",
        }).promise();
        req.channelIcon = file_res.Key;
    }
    next();
};

const uploadLocationImages = async (req, res, next) => {
    locationImages(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadLocationImagesS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [];
    var locationImages = [];
    if (files.location_images && files.location_images.length > 0) {
        multi_files_promise = files.location_images.map(async (img_vid, i) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/event-location/" + random_id + "_" + Date.now() + "-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            locationImages.push({ img: process.env.AWS_IMG_VID_PATH + file.Key, order: i + 1 });
        });
        await Promise.all([...multi_files_promise]);
    }
    req.locationImages = locationImages;
    next();
};

const uploadPartnerHelpfulLinkIcon = async (req, res, next) => {

    helpfulLinkIcon(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadPartnerHelpfulLinkIconS3Bucket = async (req, res, next) => {
    const file = req.file;
    if (file) {
        var file_res = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/partner/" + Date.now() + "-" + file.originalname,
            Body: file.buffer,
            ACL: "public-read",
        }).promise();
        req.linkIcon = file_res.Key;
    }
    next();
};

const uploadPartnerImages = async (req, res, next) => {

    PartnerIcon(req, res, (error) => {
        if (error) {
            if (error.code == "LIMIT_FILE_SIZE") {
                return res.status(200).json({ status: false, message: "File Size is too large. Allowed file size is 10M" });
            }
        } else {
            if (!req.files) {
                return res.status(200).json({ status: false, message: "File not found!" });
            }
        }
        next();
    });
};

const uploadPartnerImagesS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [];
    var iconImages = [];

    if (files.partnerIcon && files.partnerIcon.length > 0) {
        multi_files_promise = files.partnerIcon.map(async (img_vid, i) => {
            var random_id = uuidv4();
            img_vid.originalname = img_vid.originalname.replace(",", "");
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/partner/" + random_id + "_" + Date.now() + "-logo-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            req.partnerIcon = process.env.AWS_IMG_VID_PATH + file.Key
            iconImages.push(process.env.AWS_IMG_VID_PATH + file.Key);
        });
        await Promise.all([...multi_files_promise]);
    }

    if (files.webBanner && files.webBanner.length > 0) {
        multi_files_promise = files.webBanner.map(async (img_vid, i) => {
            var random_id = uuidv4();
            img_vid.originalname = img_vid.originalname.replace(",", "");
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/partner/" + random_id + "_" + Date.now() + "-web-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();
            req.webBanner = process.env.AWS_IMG_VID_PATH + file.Key

        });
        await Promise.all([...multi_files_promise]);
    }

    if (files.thumbnail && files.thumbnail.length > 0) {
        multi_files_promise = files.thumbnail.map(async (img_vid, i) => {
            var random_id = uuidv4();
            img_vid.originalname = img_vid.originalname.replace(",", "");
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/partner/" + random_id + "_" + Date.now() + "-thumb-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            req.thumbnail = process.env.AWS_IMG_VID_PATH + file.Key
        });
        await Promise.all([...multi_files_promise]);
    }

    if (files.mobileBanner && files.mobileBanner.length > 0) {
        multi_files_promise = files.mobileBanner.map(async (img_vid, i) => {
            var random_id = uuidv4();
            img_vid.originalname = img_vid.originalname.replace(",", "");
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/partner/" + random_id + "_" + Date.now() + "-mobile-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            req.mobileBanner = process.env.AWS_IMG_VID_PATH + file.Key
        });
        await Promise.all([...multi_files_promise]);
    }

    if (files.darkCompanyLogo && files.darkCompanyLogo.length > 0) {
        multi_files_promise = files.darkCompanyLogo.map(async (img_vid, i) => {
            var random_id = uuidv4();
            img_vid.originalname = img_vid.originalname.replace(",", "");
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/partner/" + random_id + "_" + Date.now() + "-darkLogo-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            req.darkCompanyLogo = process.env.AWS_IMG_VID_PATH + file.Key
        });
        await Promise.all([...multi_files_promise]);
    }
    next();
};

const uploadCategoryImage = async (req, res, next) => {

    videoCategoryImage(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadCategoryImageS3Bucket = async (req, res, next) => {
    const file = req.file;

    if (file) {
        var file_res = await s3.upload({
            Bucket: process.env.AWS_BUCKET,
            Key: "uploads/videocategory/" + Date.now() + "-" + file.originalname,
            Body: file.buffer,
            ACL: "public-read",
        }).promise();
        req.categoryImage = file_res.Key;
    }
    next();
};

const uploadCommonImage = async (req, res, next) => {
    commonImage(req, res, (error) => {
        if (error) {
            return res.status(200).json({ status: false, message: "Not valid file.", error });
        }
        next();
    });
};

const uploadCommonImageS3Bucket = async (req, res, next) => {
    const files = req.files;
    var multi_files_promise = [];
    var commonImages = [];

    if (files.image && files.image.length > 0) {
        multi_files_promise = files.image.map(async (img_vid, i) => {
            var random_id = uuidv4();
            const file = await s3.upload({
                Bucket: process.env.AWS_BUCKET,
                Key: "uploads/common-image/" + random_id + "_" + Date.now() + "-common-" + img_vid.originalname.replace(/\s/g, "_"),
                Body: img_vid.buffer,
                ACL: "public-read",
                ContentDisposition: 'attachment; filename=' + img_vid.originalname.replace(/\s/g, "_"),
            }).promise();

            commonImages.push(process.env.AWS_IMG_VID_PATH + file.Key);
        });
        await Promise.all([...multi_files_promise]);
        req.image = commonImages;
    }
    next();
};


module.exports = {
    uploadmedia: uploadmedia,
    resizeImages: resizeImages,
    groupUploads: groupUploads,
    uploadGrpImgToS3Bucket: uploadGrpImgToS3Bucket,
    uploadGroupFile: uploadGroupFile,
    uploadGroupFilesToS3: uploadGroupFilesToS3,
    topicUpload: topicUpload,
    uploadTpcImgToS3Bucket: uploadTpcImgToS3Bucket,
    uploadSignUPQuestionMedia: uploadSignUPQuestionMedia,
    uploadforQnA: uploadforQnA,
    uploadQuestionsMediaToS3: uploadQuestionsMediaToS3,
    userProfileImageUpload: userProfileImageUpload,
    uploadprofileImgToS3Bucket: uploadprofileImgToS3Bucket,
    uploadUserprofileImgToS3Bucket: uploadUserprofileImgToS3Bucket,
    uploadContentMedia: uploadContentMedia,
    uploadcontentMediaToS3Bucket: uploadcontentMediaToS3Bucket,
    deleteImage: deleteImage,
    uploadDummyFile: uploadDummyFile,
    uploaddummyfileToS3Bucket: uploaddummyfileToS3Bucket,
    uploadChatFile: uploadChatFile,
    uploadChatFileToS3Bucket: uploadChatFileToS3Bucket,
    uploadGroupChatFileToS3Bucket: uploadGroupChatFileToS3Bucket,
    chatgroupUploads: chatgroupUploads,
    uploadChatGrpImgToS3Bucket: uploadChatGrpImgToS3Bucket,
    bulkfile: bulkfile,
    uploadLargeFile: uploadLargeFile,
    uploadLargefileToS3Bucket: uploadLargefileToS3Bucket,
    uploadSpeakerPhoto: uploadSpeakerPhoto,
    uploadSpeakerPhotoToS3Bucket: uploadSpeakerPhotoToS3Bucket,
    uploadEventActivityIcon: uploadEventActivityIcon,
    uploadEventActivityIconS3Bucket: uploadEventActivityIconS3Bucket,
    uploadEventThumbnail: uploadEventThumbnail,
    uploadEventThumbnailS3Bucket: uploadEventThumbnailS3Bucket,
    uploadEventImages: uploadEventImages,
    uploadEventImagesS3Bucket: uploadEventImagesS3Bucket,
    uploadEventGallery: uploadEventGallery,
    uploadEventGalleryS3Bucket: uploadEventGalleryS3Bucket,
    uploadBannerImage: uploadBannerImage,
    uploadBannerImageS3Bucket: uploadBannerImageS3Bucket,
    uploadPartnerBannerImage:uploadPartnerBannerImage,
    uploadPartnerBannerImageS3Bucket:uploadPartnerBannerImageS3Bucket,
    uploadNewsThumbnail: uploadNewsThumbnail,
    uploadNewsThumbnailS3Bucket: uploadNewsThumbnailS3Bucket,
    uploadNewsImages: uploadNewsImages,
    uploadNewsImagesS3Bucket: uploadNewsImagesS3Bucket,
    uploadChannelIcon: uploadChannelIcon,
    uploadChannelIconS3Bucket: uploadChannelIconS3Bucket,
    uploadLocationImages: uploadLocationImages,
    uploadLocationImagesS3Bucket: uploadLocationImagesS3Bucket,
    uploadPartnerHelpfulLinkIcon: uploadPartnerHelpfulLinkIcon,
    uploadPartnerHelpfulLinkIconS3Bucket: uploadPartnerHelpfulLinkIconS3Bucket,
    uploadPartnerImages: uploadPartnerImages,
    uploadPartnerImagesS3Bucket: uploadPartnerImagesS3Bucket,
    uploadCategoryImage: uploadCategoryImage,
    uploadCategoryImageS3Bucket: uploadCategoryImageS3Bucket,
    uploadCommonImage: uploadCommonImage,
    uploadCommonImageS3Bucket: uploadCommonImageS3Bucket,
};
