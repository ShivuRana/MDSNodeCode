const express = require("express");
const router = express.Router();
const eventTypeController = require("../../controller/eventManagement/eventTypeController")

const { isAdmin, verifyGuestOrUser } = require("../../middleware/authtoken");

// Event type crud operations
router.post("/event/createEventType", isAdmin, eventTypeController.createEventType)
router.post("/event/editEventType/:id", isAdmin, eventTypeController.editEventType)
router.patch("/event/deleteEventType/:id", isAdmin, eventTypeController.deleteEventType);
router.get("/event/EventTypelist", isAdmin, eventTypeController.getAllEventType);
router.get("/event/EventTypedetail/:id", isAdmin, eventTypeController.getEventTypeById);
router.get("/event/EventTypelistData", eventTypeController.getAllEventTypeList);

// user Event search API routes
router.post("/addEventSearch", verifyGuestOrUser, eventTypeController.addEventSearchHistory);
router.post("/removeEventSearch/:id", verifyGuestOrUser, eventTypeController.removeEventSearchHistory);
router.get("/topEventSearch", verifyGuestOrUser, eventTypeController.topEventSearchHistory);
router.get("/allEventList", verifyGuestOrUser, eventTypeController.allEventList);
router.get("/event/eventSearchList", verifyGuestOrUser, eventTypeController.allEventSearchList);

module.exports = router;