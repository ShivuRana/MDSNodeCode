const express = require("express");
const router = express.Router();
const controller = require("../../controller/eventManagement/eventRoomAndSessionController");
const { isAdmin, verifyToken, verifyGuestOrUser } = require("../../middleware/authtoken");

/** Code By SJ **/

/** Routes of CURD Opration of Room **/
router.post("/event/createRoom", isAdmin, controller.createRoom);
router.patch("/event/editRoom/:id", isAdmin, controller.editRoom);
router.patch("/event/deleteRoom/:id", isAdmin, controller.deleteRoom);
router.get("/event/getAllRooms", isAdmin, controller.getAllRooms);
router.get("/event/getAllRoomsByEventId/:eventId", isAdmin, controller.getAllRoomsByEventId);
router.get("/event/getRoomDetails/:id", isAdmin, controller.getRoomDetails);

/** Routes of CURD Opration of Session **/
router.post("/event/createSession", isAdmin, controller.createSession);
router.patch("/event/editSession/:id", isAdmin, controller.editSession);
router.patch("/event/deleteSession/:id", isAdmin, controller.deleteSession);
router.get("/event/getAllSessions", isAdmin, controller.getAllSessions);
router.get("/event/getAllSessionsByEventId/:eventId", isAdmin, controller.getAllSessionsByEventId);
router.get("/event/getSessionListByDate", isAdmin, controller.getSessionListByDate);
router.get("/event/getSessionDetails/:id", isAdmin, controller.getSessionDetails);

/** Routes of frontend session api's **/
router.get("/event/getSessionListByActivity/:id", verifyGuestOrUser, controller.getSessionListByActivity);
router.get("/event/getSessionDetailById/:id", verifyGuestOrUser, controller.getSessionDetailsById);
module.exports = router;
