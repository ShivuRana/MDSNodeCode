const express = require("express");
const router = express.Router();
const controller = require("../../controller/eventManagement/eventController");
const upCommingController = require("../../controller/eventManagement/eventUpcommingListController");
const { isAdmin, verifyToken, verifyGuestOrUser } = require("../../middleware/authtoken");
const { uploadEventThumbnail, uploadEventThumbnailS3Bucket, uploadEventGallery, uploadEventGalleryS3Bucket, uploadLocationImages, uploadLocationImagesS3Bucket } = require("../../utils/mediaUpload");

/** Admin Routes Starts **/
//event packages routes
router.post("/event/addpackage", isAdmin, controller.createEventPackage);
router.patch("/event/editpackage/:id", isAdmin, controller.editEventPackage);
router.patch("/event/deletepackage/:id", isAdmin, controller.deleteEventPackage);
router.get("/event/getallpackages", isAdmin, controller.getAllEventPackages);
router.get("/event/getallpackagesByEventId/:eventId", isAdmin, controller.getAllEventPackagesByEventId);
router.get("/event/getpackagedetail/:id", isAdmin, controller.getPackageDetail);
router.post("/event/packageReorder", isAdmin, controller.packageReorder);
//event location routes
router.post("/event/addlocation", isAdmin, uploadLocationImages, uploadLocationImagesS3Bucket, controller.createEventLocation);
router.patch("/event/editlocation/:id", isAdmin, uploadLocationImages, uploadLocationImagesS3Bucket, controller.editEventLocation);
router.patch("/event/deletelocation/:id", isAdmin, controller.deleteEventLocation);
router.get("/event/getalllocation", isAdmin, controller.getAllEventLocations);
router.get("/event/getalllocationbyeventid/:eventId", isAdmin, controller.getAllEventLocationsByEventId);
router.get("/event/getlocationdetail/:id", isAdmin, controller.getLocationDetail);
//event routes
router.post("/event/addLocationImages", isAdmin, uploadLocationImages, uploadLocationImagesS3Bucket, controller.uploadEventLocationPhotos);
router.post("/event/addEvent", isAdmin, uploadEventThumbnail, uploadEventThumbnailS3Bucket, controller.createEvent);
router.patch("/event/editLocationImages/:id", isAdmin, uploadLocationImages, uploadLocationImagesS3Bucket, controller.uploadNEditEventLocationPhotos);
router.patch("/event/editEvent/:id", isAdmin, uploadEventThumbnail, uploadEventThumbnailS3Bucket, controller.editEvent);
router.patch("/event/deleteEvent/:id", isAdmin, controller.deleteEvent);
router.get("/event/getAllEvents", isAdmin, controller.getAllEvent);
router.get("/event/getAllEventsLimitedFiedls", isAdmin, controller.getAllEventsLimitedFiedls);
router.get("/event/getEventById/:id", isAdmin, controller.getEventDetail);
router.post("/event/cloneEvent", isAdmin, controller.cloneEvent);


router.post("/event/addEventGallery/:id", isAdmin, uploadEventGallery, uploadEventGalleryS3Bucket, controller.saveEventPhotos);
router.get("/event/getEventGallery/:id", isAdmin, controller.getEventGallery);
router.patch("/event/deleteEventGallery/", isAdmin, controller.deleteEventPhotos);

router.post("/event/importAttendees/", isAdmin, controller.importAttendeesIMP);
router.get("/event/exportAttendees/", isAdmin, controller.exportAttendees);
router.get("/event/getAttendeesByEventId/:id", isAdmin, controller.getAttendeesByEventId);
router.post("/event/createEventAttendees", isAdmin, controller.createEventAttendees);
router.patch("/event/editEventAttendees/:id", isAdmin, controller.editEventAttendees);
router.patch("/event/deleteEventAttendees", isAdmin, controller.deleteEventAttendees);
router.get("/event/getAttendee/:id", isAdmin, controller.getAttendeeById);
router.patch("/event/editContactSupportInEvent/:id", isAdmin, controller.editContactSupportInEvent);
router.get("/event/getPastEventNameList", isAdmin, controller.getPastEventNameList);
/** Admin Routes Starts **/

/** User Routes Starts **/
router.get("/event/getGallery/:id", verifyGuestOrUser, controller.getGallery);
router.get("/event/getEventList", verifyGuestOrUser, controller.getEventList);
router.get("/event/getPastEventYearList", verifyGuestOrUser, controller.getPastEventYearList);
router.get("/event/getPastEventYearFilterList", verifyGuestOrUser, controller.getPastEventYearFilterList);
router.get("/event/getPastEvent", verifyGuestOrUser, controller.getPastEventList);
router.get("/event/getPastEvent/:id", verifyGuestOrUser, controller.getPastEventById);
router.get("/event/getEventActivityList/:id", verifyGuestOrUser, controller.getEventActivityByEventId);
router.get("/event/getEventActivity/:id", verifyGuestOrUser, controller.getEventActivityById);
router.get("/event/getEvent/:id", verifyGuestOrUser, controller.getEventById);
router.get("/event/getEventAttendeesByEventId/:id", verifyGuestOrUser, controller.getEventAttendeesByEventId);
router.get("/event/getEventAttendeeList/:id", verifyGuestOrUser, controller.getEventAttendeeList);
router.get("/event/getAttendeesDetailById/:id", verifyGuestOrUser, controller.getEventAttendeeProfile);
router.get("/event/getAttendeeById/:id", verifyGuestOrUser, controller.getAttendeeWithoutEventById);
router.post("/event/scheduleNotificationForEventActivitySession", verifyGuestOrUser, controller.scheduleNotificationForEventActivitySession);
router.patch("/event/partner/reorder", isAdmin, controller.rearrangeAttendees);
router.get("/event/getUpCommingEvent", verifyGuestOrUser, upCommingController.getUpCommingEventList);
router.get("/event/getUpCommingEvent/:id", verifyGuestOrUser, upCommingController.getUpcomingEventById);
/** User Routes Ends **/
module.exports = router;
