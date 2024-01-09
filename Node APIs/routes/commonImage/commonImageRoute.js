const express = require("express");
const router = express.Router();
const { verifyGuestOrUser, isAdmin } = require("../../middleware/authtoken");
const controller = require("../../controller/commonImage/commonImageController");
const { uploadCommonImage, uploadCommonImageS3Bucket } = require("../../utils/mediaUpload");

/** Common Images APIs Routes **/
router.post("/common/images", isAdmin, uploadCommonImage, uploadCommonImageS3Bucket, controller.uploadCommonImages);
router.get("/commonImages", isAdmin, controller.getAllCommonImages);
router.patch("/deleteCommonImages", isAdmin, controller.deleteCommonImages);

module.exports = router;
