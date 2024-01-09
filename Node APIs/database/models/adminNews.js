const mongoose = require("mongoose");

const adminNewsSchema = mongoose.Schema(
  {
    title: {
        type: String,
    },
    thumbnail: {
        type: String
    },
    description: {
        type: String
    },
    date: {
        type: Date
    },
    publishOrHide: {
        type: String,
        enum: ["publish", "hide"],
        default: "hide"
    },
    makeFeaturedCheckbox: {
        type: Boolean,
        default: false
    },
    newsType: {
        type: String,
        enum: ["news", "video", "partner", "document"],
        default: "news",
    },
    videoReferenceId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "contentArchive_video"
    }
  },
  { timestamps: true }
);
const autoPopulateChildren = function (next) {
    this.populate("videoReferenceId", "video title description thumbnail", {isDelete: false});
    next();
} 
adminNewsSchema.pre("findOne", autoPopulateChildren)
adminNewsSchema.pre("findById", autoPopulateChildren) 
adminNewsSchema.pre("find", autoPopulateChildren)
module.exports = mongoose.model("adminNews", adminNewsSchema);
