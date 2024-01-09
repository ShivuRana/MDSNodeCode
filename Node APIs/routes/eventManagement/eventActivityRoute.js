const express = require("express");
const router = express.Router();
const { uploadEventActivityIcon, uploadEventActivityIconS3Bucket, uploadEventImages, uploadEventImagesS3Bucket } = require("../../utils/mediaUpload");
const controller = require("../../controller/eventManagement/eventActivityController");
const { isAdmin } = require("../../middleware/authtoken");

// Common Route
router.post("/event/upload/files", isAdmin, uploadEventImages, uploadEventImagesS3Bucket, controller.saveFiles);

// Event Activity Route
router.post("/event/createActivity", isAdmin, uploadEventActivityIcon, uploadEventActivityIconS3Bucket, controller.createEventActivity);
router.patch("/event/editActivity/:id", isAdmin, uploadEventActivityIcon, uploadEventActivityIconS3Bucket, controller.editEventActivity);
router.patch("/event/deleteActivity/:id", isAdmin, controller.deleteEventActivity);
router.get("/event/getAllActivitys", isAdmin, controller.getAllEventActivity);
router.get("/event/getAllActivitysByEventId/:eventId", isAdmin, controller.getAllEventActivityByEventId);
router.get("/event/getActivityById/:id", isAdmin, controller.getActivityDetail);
router.get("/event/getAllActivityImages", isAdmin, controller.getAllActivityImages);
router.patch("/event/deleteActivityIcon", isAdmin, controller.deleteActivityIcon);

// Event Faqs Route
router.post("/event/createFaq", isAdmin, controller.createFaq);
router.patch("/event/editFaq/:id", isAdmin, controller.editFaq);
router.patch("/event/deleteFaq/:id", isAdmin, controller.deleteFaq);
router.get("/event/getAllFaqs", isAdmin, controller.getAllFaqs);
router.get("/event/getAllEventFaqsByEventId/:eventId", isAdmin, controller.getAllEventFaqsByEventId);
router.get("/event/getFaqDetail/:id", isAdmin, controller.getFaqDetail);

// Event Contact Support Route
router.post("/event/createContactSupport", isAdmin, controller.createContactSupport);
router.patch("/event/editContactSupport/:id", isAdmin, controller.editContactSupport);
router.patch("/event/deleteContactSupport/:id", isAdmin, controller.deleteContactSupport);
router.get("/event/getAllContactSupports", isAdmin, controller.getAllContactSupports);
router.get("/event/getAllContactSupportsByEventId/:id", isAdmin, controller.getAllContactSupportsByEventId);
router.get("/event/getContactSupportDetail/:id", isAdmin, controller.getContactSupportDetail);
router.post("/event/sendNotificationForNotifyUser/", controller.sendNotificationForNotifyUserAPI);

module.exports = router;