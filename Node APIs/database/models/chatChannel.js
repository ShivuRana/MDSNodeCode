const mongoose = require("mongoose");

const chatChannelSchema = mongoose.Schema(
  {
    channelName: {
      type: String,
      default: "",
    },
    channelIcon: {
      type: String,
      default: "",
    },
    eventId: {
        type: mongoose.Schema.Types.ObjectId, 
        ref: "event", 
    },
    withEvent: {
        type: Boolean,
        default: false
    },
    accessPermission: {
        type: String,
        enum: [ "public", "admin", "restricted", "" ],
        default: ""
    },
    restrictedAccess: {
        type: Array, // ["speaker", "member", "partner", "guest"]
        default: []
    },
    isDelete: {
      type: Boolean,
      default: false,
    },
   
  },
  { timestamps: true }
);

var autoPopulateChildren = function (next) {
    this.populate(
        "eventId",
        "title thumbnail shortDescription longDescription"
    );
    next();
};

chatChannelSchema
    .pre("findOne", autoPopulateChildren)
    .pre("find", autoPopulateChildren)
    .pre("findByIdAndUpdate", autoPopulateChildren)
    .pre("findOneAndUpdate", autoPopulateChildren);
module.exports = mongoose.model("chatChannel", chatChannelSchema);
