const express = require("express");
const router = express.Router();
const { isAdmin, verifyToken } = require("../../middleware/authtoken");
const questionnaireController = require("../../controller/userManagement/questionnaireController");

router.post("/question/create", questionnaireController.createQuestionnaire);

router.put("/question/edit/:id", questionnaireController.updateQuestionnaire);
router.put("/question/delete/:id", questionnaireController.deleteQuestionnaire);
router.put("/question/reorder", questionnaireController.reOrderQuestions);

router.get("/question/:id", questionnaireController.getQuestionnairebyId);
router.get("/questions", questionnaireController.getQuestionnaires);

module.exports = router;
