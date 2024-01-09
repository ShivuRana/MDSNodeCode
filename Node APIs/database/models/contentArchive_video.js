const mongoose = require("mongoose");

const archiveSchema = mongoose.Schema(
  {
    video: { type: String, required: true },
    video_240: { type: String },
    video_360: { type: String },
    video_480: { type: String },
    subtitle_file: { type: String, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String },
    categories: [{ type: mongoose.Schema.Types.ObjectId, ref: "contentArchive_category" }],
    subcategory: [{ type: mongoose.Schema.Types.ObjectId, ref: 'contentArchive_subcategory' }],
    speaker: [{ type: mongoose.Schema.Types.ObjectId, ref: 'airtable-syncs' }],
    tag: [{ type: mongoose.Schema.Types.ObjectId, ref: 'contentArchive_tag' }],
    relevant_partners: [
      {
        name: String,
        logo: {
          type: String,
          default: "",
        },
        url: {
          type: String,
          default: "",
        },
      },
    ],
    clif_notes_title: { type: String, default: "" },
    clif_notes: [{ type: String }],
    files: [
      {
        name: String,
        url: {
          type: String,
          default: "",
        },
      },
    ],
    user_video_pause: { type: Object },
    group_ids: [{ type: mongoose.Schema.Types.ObjectId, ref: "group" }],
    eventIds: [{ type: mongoose.Schema.Types.ObjectId, ref: "event" }],
    views: [{ view_userid: { type: mongoose.Schema.Types.ObjectId }, viewdate: { type: Date, default: "" } }],
    likes: [{ like_userid: { type: mongoose.Schema.Types.ObjectId }, likedate: { type: Date, default: "" } }],
    comments: [{ type: mongoose.Schema.Types.ObjectId, ref: "contentArchiveComment" }],
    thumbnail: { type: String },
    isDelete: { type: Boolean, default: false },
    uploadstatus: { type: String, default: "completed" },
    eventFor: { type: String, default: "others" },
    starting_view_cnt: { type: Number, default: 0 },
    watched_realtime: [{ userid: { type: mongoose.Schema.Types.ObjectId }, watch_realduration: { type: String, default: "00:00:00" } }],
    duration: { type: String, default: "00:00:00" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }
);

var autoPopulateChildren = function (next) {
  this.populate("categories", "name", { isDelete: false });
  this.populate("subcategory", "name", { isDelete: false });
  this.populate("speaker", { auth0Id: 1, otherdetail: 1, profileImg: 1, speakerIcon: 1, guestIcon: 1, partnerIcon: 1, "attendeeDetail.title": 1, "attendeeDetail.name": 1, "attendeeDetail.profession": 1, }, { isDelete: false });
  this.populate("tag", "name", { isDelete: false });
  this.populate("group_ids", "groupTitle", { isDelete: false });
  this.populate("eventIds", "title thumbnail timeZone startDate startTime endDate endTime activities", { isDelete: false });
  next();
};

archiveSchema
  .pre("findOne", autoPopulateChildren)
  .pre("find", autoPopulateChildren)
  .pre("findOneAndUpdate", autoPopulateChildren);

module.exports = mongoose.model("contentArchive_video", archiveSchema);
