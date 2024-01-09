const mongoose = require("mongoose");

const questionasnwerSchema = mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "airtable-syncs",
      required: true,
    },
    question: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "questionnaire",
      required: true,
    },
    answer_object: {
      type: Object,
      required: true,
    },
    status: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

const QuestionAnswer_byUser = mongoose.model(
  "question_answer_byUser",
  questionasnwerSchema
);

module.exports = QuestionAnswer_byUser;
