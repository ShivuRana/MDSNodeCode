const Questionnaire = require("../../database/models/questionnaire");

exports.createQuestionnaire = async (req, res) => {
  try {
    const order_count = await Questionnaire.countDocuments({});
    const data = new Questionnaire({ ...req.body, order: order_count + 1 });
    const result = await data.save();
    return res
      .status(201)
      .send({ status: true, message: "Question created.", data: result });
  } catch (error) {
    return res.status(400).send({ status: false, message: error.message });
  }
};

exports.updateQuestionnaire = async (req, res) => {
  try {
    var option = req.body.option;
    if (req.body.input_type !== "checkbox" || req.body.input_type !== "radio") {
      option = [];
    }
    const result = await Questionnaire.findByIdAndUpdate(
      req.params.id,
      { ...req.body, option: option },
      { new: true, runValidators: true }
    );
    return res
      .status(201)
      .send({ status: true, message: "Question updated.", data: result });
  } catch (error) {
    return res.status(400).send({ status: false, message: error.message });
  }
};

exports.deleteQuestionnaire = async (req, res) => {
  try {
    const result = await Questionnaire.findByIdAndUpdate(
      req.params.id,
      { isDelete: true, order: 0 },
      { new: true }
    );
    return res.status(201).send({ status: true, message: "Question deleted." });
  } catch (error) {
    return res.status(400).send({ status: false, message: error.message });
  }
};

exports.getQuestionnairebyId = async (req, res) => {
  try {
    const result = await Questionnaire.findOne({
      _id: req.params.id,
      isDelete: false,
      order: { $gt: 0 },
    });
    return res
      .status(201)
      .send({ status: true, message: "Get question by Id.", data: result });
  } catch (error) {
    return res.status(400).send({ status: false, message: error.message });
  }
};

exports.getQuestionnaires = async (req, res) => {
  try {
    await Questionnaire.updateMany({}, { $set: { isDelete: false } });
    const result = await Questionnaire.find({
      isDelete: false,
      order: { $gte: 1 },
    }).sort({ order: 1 });
    return res
      .status(201)
      .send({ status: true, message: "All questions.", data: result });
  } catch (error) {
    return res.status(400).send({ status: false, message: error.message });
  }
};

exports.reOrderQuestions = async (req, res) => {
  try {
    const { questions_bank } = req.body;
    questions_bank?.map(async (item, i) => {
      await Questionnaire.findOneAndUpdate(
        { _id: item._id, isDelete: false },
        { order: i + 1 },
        { new: true }
      );
    });
    const result = await Questionnaire.find({ isDelete: false }).sort({
      order: 1,
    });
    return res
      .status(201)
      .send({ status: true, message: "All questions.", data: result });
  } catch (error) {
    return res.status(400).send({ status: false, message: error.message });
  }
};
