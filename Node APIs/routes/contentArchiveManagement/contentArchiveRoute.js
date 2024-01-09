const express = require("express");
const router = express.Router();
const controller = require("../../controller/contentArchiveManagement/contentArchiveController");
const mediaUpload = require("../../utils/mediaUpload");
const { verifyToken, isAdmin, verifyGuestOrUser } = require("../../middleware/authtoken");
router.post("/category/create", isAdmin, mediaUpload.uploadCategoryImage, mediaUpload.uploadCategoryImageS3Bucket, controller.createCategoty);

router.post("/video/create", isAdmin, mediaUpload.uploadContentMedia, mediaUpload.uploadcontentMediaToS3Bucket, controller.createVideo);
router.post("/video/compress", isAdmin, controller.CompressVideo);
router.post("/mobile-upload", mediaUpload.uploadDummyFile, mediaUpload.uploaddummyfileToS3Bucket, controller.uploadMedia_single);

router.put("/video/edit", isAdmin, mediaUpload.uploadContentMedia, mediaUpload.uploadcontentMediaToS3Bucket, controller.editVideo);

router.patch("/video/delete/:id", isAdmin, controller.deleteContentVideo_byId);

router.get("/categories", verifyToken, controller.getCategoriesList);
router.get("/AS/categories", isAdmin, controller.getCategoriesList_as);
router.delete("/delete/categories/:id", isAdmin, controller.deleteCategory);

router.get("/category/:id", controller.getCategorybyId);

router.put("/category/edit/:id", isAdmin, mediaUpload.uploadCategoryImage, mediaUpload.uploadCategoryImageS3Bucket, controller.editCategory);

router.get("/content-archive/videos", isAdmin, controller.getContentVideolist);

router.get("/content-archive/user/videos", verifyToken, controller.getContentVideo_UserWiselist);

router.get("/content-archive/user/search-video", verifyToken, controller.getSearchContentVideo);

router.get("/content-archive/video/:id", controller.getContentVideo_byId);

router.get("/content-archive/video/foruser/:id", verifyToken, controller.getContentVideo_byId_byUser);

router.get("/content-archive/deletedvideos", isAdmin, controller.getDeletedContent_Video);

router.patch("/video/restore/:id", isAdmin, controller.restoreContent_Video_Byid);

router.delete("/permenant-delete/content-arcive/:id", isAdmin, controller.permenantDelete_ContentVideo_Byid);

router.patch("/add-pause-video/:id", isAdmin, controller.adminaddpausetime);

router.patch("/add-pause-video/user/:id", verifyToken, controller.useraddpausetime);

router.patch("/AS/add-view/:id", isAdmin, controller.addvideoviewadmin);

router.patch("/add-view/:id", verifyToken, controller.addvideoviewuser);

router.patch("/AS/add-like/:id", isAdmin, controller.addvideolikeadmin);

router.patch("/add-like/:id", verifyToken, controller.addvideolikeuser);

router.get("/getvideobycategories/:cateId", verifyToken, controller.getvideobycategory);
router.get("/AS/getvideobycategories/:cateId", isAdmin, controller.getvideobycategory_byadmin);
router.get("/getpopularvideos", verifyToken, controller.getmostpopularvideos);

router.get("/getrecentlyadded", verifyToken, controller.getrecentlyaddedvideos);

router.get("/getrelatedvideos/:videoId", verifyToken, controller.getrelatedvideos);

router.get("/getnewestcommentsvideos", verifyToken, controller.getnewestcommentsvideo);
router.get("/getvideouploadstatus", isAdmin, controller.getProcessStatus);

router.get("/getallvideosfroms3bucket", controller.get_allvideos_from_s3bucket);

/** code by SJ start **/
router.get("/getVideoByCategoriesFilter", verifyToken, controller.getVideoByCategoriesAndFilter);
router.get("/getVideoByCateFilterSort", verifyToken, controller.getVideoByCateFilterSort);
// router.get("/videoBySubCategoriesAndFilter", verifyToken, controller.getVideoBySubCategoriesAndFilter);
// router.get("/videoBySubCateFilterSort", verifyToken, controller.getVideoBySubCateFilterSort);
router.get("/getVideoBySearchFilter", verifyToken, controller.getVideoBySearchFilter);
router.patch("/addAndUpdateVideoHistory", verifyToken, controller.addAndUpdateVideoHistoryById);
router.get("/getVideoHistoryByUser", verifyToken, controller.getVideoHistoryByUser);
router.patch("/removeVideoHistory", verifyToken, controller.removeVideoHistoryById);
router.patch("/removeAllVideoHistory", verifyToken, controller.removeAllVideoHistory);


/** Speaker routes **/
router.post("/createSpeaker", isAdmin, mediaUpload.uploadSpeakerPhoto, mediaUpload.uploadSpeakerPhotoToS3Bucket, controller.createSpeaker);
router.put("/speaker/edit/:id", isAdmin, mediaUpload.uploadSpeakerPhoto, mediaUpload.uploadSpeakerPhotoToS3Bucket, controller.updateSpeaker);
router.post("/createSpeakerInUser", isAdmin, mediaUpload.userProfileImageUpload, mediaUpload.uploadUserprofileImgToS3Bucket, controller.createSpeakerInUser);
router.get("/speakerList", isAdmin, controller.adminSpeakerList);
router.get("/speakerById/:id", isAdmin, controller.speakerById);
router.post("/speaker/delete/:id", isAdmin, controller.deleteSpeaker);
router.get("/getAllSpeakers", isAdmin, controller.getAllSpeakerList)
router.get("/exportSpeakers", isAdmin, controller.exportSpeakers);
router.post("/importSpeakers", isAdmin, controller.importSpeakers);
/** Tags routes **/
router.post("/createTag", isAdmin, controller.createTag);
router.put("/tag/edit/:id", isAdmin, controller.updateTag);
router.get("/tagList", isAdmin, controller.adminTagList);
router.get("/tagById/:id", isAdmin, controller.tagById);
router.post("/tag/delete/:id", isAdmin, controller.deleteTag);

router.patch("/deleteComment", controller.deleteCommentFromVideo);

router.post("/addSearch", verifyGuestOrUser, controller.addSearchHistory);
router.post("/removeSearch/:id", verifyGuestOrUser, controller.removeSearchHistory);
router.get("/topSearch", verifyGuestOrUser, controller.topSearchHistory);
router.get("/allVideo", verifyGuestOrUser, controller.allVideoList);
router.get("/getMetaData", controller.getMetaData);

/** Event routes **/
router.post("/createEvent", isAdmin, controller.createEvent);
router.put("/event/edit/:id", isAdmin, controller.updateEvent);
router.get("/eventList", isAdmin, controller.adminEventList);
router.get("/eventById/:id", isAdmin, controller.eventById);
router.post("/event/delete", isAdmin, controller.deleteEvent);
//temporary use for delete events from user -postman api
router.post("/event/deleteEvents", isAdmin, controller.deleteUserEvents);
router.get("/getVideoSpeakerProfile/:id", verifyGuestOrUser, controller.getVideoSpeakerProfile);

/** code by SJ end **/

/* code by sheetal */
router.get("/restevents/:id", isAdmin, controller.restEvents);
/* Video list */
router.get("/videolistbyadmin", isAdmin, controller.allVideoList_byadmin);
router.get("/videolistbydatefilter", isAdmin, controller.allVideoListByDateForAdmin);

/* end */

/*route for search video feature in content video library on admin side */
router.get("/AS/getAllOverVideos/", isAdmin, controller.getAllOverContentVideoByAdmin);
router.post("/addUserWatchTime", verifyToken, controller.AddRealWatchTime);

/* router for eventbased or speaker based video list */
router.get("/FS/getAllContentVideoByEventOrSpeaker/", verifyToken, controller.getAllContentVideoByEventOrSpeaker);

module.exports = router;
