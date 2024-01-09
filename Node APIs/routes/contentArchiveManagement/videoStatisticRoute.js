const express = require("express");
const router = express.Router();
const controller = require("../../controller/contentArchiveManagement/videoStatisticController");
const mediaUpload = require("../../utils/mediaUpload");
const { verifyToken, isAdmin } = require("../../middleware/authtoken");

router.get("/videostatistic-totalvideo", isAdmin, controller.videoStatisticTotalVideo);
router.get("/videostatisticforvideo-datewise", isAdmin, controller.videoStatisticForVideoByDateForAdmin);
router.get("/videostatistic-videolist-datewise", isAdmin, controller.videoStatisticVideoListByDateForAdmin);
router.get("/videoStatistic-fieldcount-datewise-foradmin", isAdmin, controller.videoStatisticFieldCountByDateAndByForAdmin);

router.get("/statisticforcategory-totalcategories", isAdmin, controller.CategoryStatisticTotalCategories);
router.get("/statisticforcategory-datewise", isAdmin, controller.statisticForCategoryByDateForAdmin);
router.get("/statistic-categorylist-datewise", isAdmin, controller.statisticCategoryListByDateForAdmin);
router.get("/statistic-categorycount-datewise-foradmin", isAdmin, controller.statisticCategoryCountByDateAndByForAdmin);
 
router.get("/statisticfortag-totaltags", isAdmin, controller.TagStatisticTotalTags);
router.get("/statisticfortag-datewise", isAdmin, controller.statisticForTagByDateForAdmin);
router.get("/statistic-taglist-datewise", isAdmin, controller.statisticTagListByDateForAdmin);
router.get("/statistic-tagcount-datewise-foradmin", isAdmin, controller.statisticTagCountByDateAndByForAdmin);

router.get("/statisticforspeaker-totalspeakers", isAdmin, controller.SpeakerStatisticTotalSpeakers);
router.get("/statisticforspeaker-datewise", isAdmin, controller.statisticForSpeakerByDateForAdmin);
router.get("/statistic-speakerlist-datewise", isAdmin, controller.statisticSpeakerListByDateForAdmin);
router.get("/statistic-speakercount-datewise-foradmin", isAdmin, controller.statisticSpeakerCountByDateAndByForAdmin);

router.get("/statisticforevent-totalevents", isAdmin, controller.EventStatisticTotalEvents);
router.get("/statisticforevent-datewise", isAdmin, controller.statisticForEventByDateForAdmin);
router.get("/statistic-eventlist-datewise", isAdmin, controller.statisticEventListByDateForAdmin);
router.get("/statistic-eventcount-datewise-foradmin", isAdmin, controller.statisticEventCountByDateAndByForAdmin);

router.get("/videostatistic-getsinglevideoviewusers", isAdmin, controller.videoStatisticSingleVideoViewUsers);
router.get("/statistic-getallvideousers", isAdmin, controller.statisticWatchedVideoUsers);
router.get("/statistic-getallvideosbyuserid", isAdmin, controller.statisticAllWatchedVideosByUserId);

/* end */

module.exports = router;
