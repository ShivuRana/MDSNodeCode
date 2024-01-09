const express = require("express");
const router = express.Router();
const controller = require("../../controller/eventManagement/eventAttendeeManageController");
const { isAdmin, verifyToken, verifyGuestOrUser } = require("../../middleware/authtoken");

/** User Routes for Attendees Starts **/
router.post("/event/loginAttendee", controller.loginGuest);
router.post("/event/setProfilePrivateOrNot", verifyGuestOrUser, controller.setAttendeeProfilePrivateOrNot);
router.post("/event/addExistingAttendeeToEvent", isAdmin, controller.addExistingAttendeeToEvent);
router.get("/event/getScheduleJobs", verifyGuestOrUser, controller.getScheduleJobs);
router.patch("/delete/attendee/fromAllAttendeeList/:id", isAdmin, controller.deleteAttendee);
router.get("/rearrangeAttendee/:eventId", controller.rearrangeAttendee);
module.exports = router;
