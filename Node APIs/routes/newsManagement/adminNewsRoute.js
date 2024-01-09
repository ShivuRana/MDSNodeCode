const express = require("express");
const router = express.Router();
const adminNewsController = require("../../controller/newsManagement/adminNewsController")
const {uploadNewsThumbnail, uploadNewsThumbnailS3Bucket, uploadNewsImages, uploadNewsImagesS3Bucket} = require("../../utils/mediaUpload");
const { isAdmin, verifyToken } = require("../../middleware/authtoken");

// news crud operations
router.post("/news/create", isAdmin, uploadNewsThumbnail, uploadNewsThumbnailS3Bucket, adminNewsController.createNews)
router.post("/news/edit/:id", isAdmin, uploadNewsThumbnail, uploadNewsThumbnailS3Bucket, adminNewsController.editNews)
router.patch("/news/delete/:id", isAdmin, adminNewsController.deleteNews);
router.get("/news/list", isAdmin, adminNewsController.getNewsList);
router.get("/contentNews/list", isAdmin, adminNewsController.getContentNewsList);
router.get("/news/detailForAdmin/:id", isAdmin, adminNewsController.getNewsDetailById);
router.patch("/news/makeNewsFeatured/:id", isAdmin, adminNewsController.makeNewsFeaturedById);
router.post("/news/upload/files", isAdmin, uploadNewsImages, uploadNewsImagesS3Bucket, adminNewsController.saveFiles);
router.get("/news/getAllNewsAndContentList", verifyToken, adminNewsController.getNewsAndContentList);
router.get("/news/detailForUser/:id", verifyToken, adminNewsController.getNewsDetailById);
router.get("/news/getFeaturedNews", verifyToken, adminNewsController.getFeaturedNews)
module.exports = router;