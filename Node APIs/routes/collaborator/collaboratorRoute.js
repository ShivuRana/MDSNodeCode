const express = require("express");
const router = express.Router();
const { verifyGuestOrUser, isAdmin } = require("../../middleware/authtoken");
const controller = require("../../controller/collaborator/collaboratorController");
const collaboratorController = require("../../controller/collaborator/collaboratorManagementController");

router.post("/collaborator/sendInvitation", isAdmin, controller.inviteCollaborator);
router.get("/getPendingCollaborators", isAdmin, controller.getPendingCollaborators);
router.get("/getAcceptedCollaborators", isAdmin, controller.getAcceptedCollaborators);
router.get("/getRevokedCollaborators", isAdmin, controller.getRevokedCollaborators);
router.post("/collaborator/resendAndRevoke", isAdmin, controller.reInviteAndRevokeCollaborator);

router.get("/collaborator", controller.sendVerificationCode);
router.get("/collaboratorDetail", controller.collaboratorDetail);
router.post("/collaborator/resend", controller.resendVerificationCode);
router.post("/collaborator/acceptInvitation", controller.acceptInvitation);

router.post("/collaborator/register", collaboratorController.createCollaboratorUser);

module.exports = router;
