var multer = require("multer");
var AWS = require("aws-sdk");

var storage = multer.memoryStorage({
  destination: function (req, file, callback) {
    callback(null, "");
  },
});

const maxSize = 10 * 1024 * 1024; // for 10MB
// const maxSize = 150

// Upload media files for image upload
const uploadMediaFiles = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).fields([
  {
    name: "images",
  },
  {
    name: "videos",
  },
]);

// Upload media file for group for image upload
const uploadMediaFilesforGrp = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).fields([
  {
    name: "groupImage",
    maxCount: 1,
  },
  {
    name: "groupCoverImage",
    maxCount: 1,
  },
]);

// Upload media files for TPC for image upload
const uploadMediaFilesforTpc = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).fields([
  {
    name: "topicImage",
    maxCount: 1,
  },
]);

// Multi media for Que on signup Icons for image upload
const multiMediaForQuestions_onSignup = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).array("multi_question_files");

// Media file for QnA Icons for image upload
const mediaFor_QnA = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).any();

// User profile Icons for image upload
const userProfileImage = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).fields([
  {
    name: "profileImg",
    maxCount: 1,
  },
  {
    name: "profileCover",
    maxCount: 1,
  },
  {
    name: "speakerIcon",
    maxCount: 1
  },
  {
    name: "guestIcon",
    maxCount: 1
  },
  {
    name: "partnerIcon",
    maxCount: 1
  }
]);

// Group file for image upload
const groupFile = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).array("file");

// Content archive Icons for image upload
const contentMedia = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).any();

// Chat file Icons for image upload
const chatFile = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
}).fields([
  {
    name: "media",
  },
  {
    name: "otherfiles",
  },
]);

// Upload media for chat group Icons for image upload
const uploadMediaforChatGrp = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).fields([
  {
    name: "group_image",
    maxCount: 1,
  },
]);

// Dummmy files for upload
const dummyFile = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).single("test_file");

// Large files for upload
const LargeFile = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).single("large_file");

// User bulk Icons for image upload
const userbulkjson = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).single("users");

// Speaker Icons for image upload
const speakerPhoto = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).single("speaker_pic");

// Activity Icons for image upload
const ActivityIcon = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
}).single("event_icon");

// Event thumbnail for image upload
const eventThumbnail = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).single("thumbnail");

// Event Icons for image upload
const eventImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
}).fields([
  {
    name: "image",
  },
]);

// Event gallery Icons for image upload
const eventGallery = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
}).fields([
  {
    name: "photo",
  },
]);

// Admin news banner and web banner Icons for image upload
const bannerImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {

    cb(null, true);
  },
}).fields([
  {
    name: 'bannerImage', maxCount: 1
  },
  {
    name: 'webBannerImage', maxCount: 1
  },
]);

// Admin partner banner image upload
const partnerBannerImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {

    cb(null, true);
  },
}).fields([
  {
    name: 'imageWeb', maxCount: 1
  },
  {
    name: 'imageMobile', maxCount: 1
  },
  
]);

// News Thumbnail Icons for image upload
const newsThumbnail = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).single("newsThumbnail");

// News Icons for image upload
const newsImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
}).fields([
  {
    name: "image",
  },
]);

// Channel Icons for image upload
const channelIcon = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).single("channelIconFile");

// Location Icons for image upload
const locationImages = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
}).fields([{ name: "location_images", },]);

// Helpful Link Icons for image upload
const helpfulLinkIcon = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  },
  limits: { fileSize: maxSize },
}).single("linkIcon");

// Partner Icons and banners for image upload
const PartnerIcon = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {

    cb(null, true);
  },
}).fields([
  {
    name: 'partnerIcon', maxCount: 1
  },
  {
    name: 'webBanner', maxCount: 1
  },
  {
    name: 'thumbnail', maxCount: 1
  },
  {
    name: 'mobileBanner', maxCount: 1
  },
  {
    name: "darkCompanyLogo", maxCount: 1
  }
]);

// Video category Icons for image upload
const videoCategoryImage = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {

    cb(null, true);
  },
}).single("categoryImage");

// Common images Icons for image upload
const commonImage = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    cb(null, true);
  }
}).fields([{ name: "image" },]);

module.exports = {
  uploadMediaFiles: uploadMediaFiles,
  uploadMediaFilesforGrp: uploadMediaFilesforGrp,
  uploadMediaFilesforTpc: uploadMediaFilesforTpc,
  multiMediaForQuestions_onSignup: multiMediaForQuestions_onSignup,
  userProfileImage: userProfileImage,
  groupFile: groupFile,
  mediaFor_QnA: mediaFor_QnA,
  contentMedia: contentMedia,
  chatFile: chatFile,
  dummyFile: dummyFile,
  userbulkjson: userbulkjson,
  uploadMediaforChatGrp: uploadMediaforChatGrp,
  LargeFile: LargeFile,
  speakerPhoto: speakerPhoto,
  ActivityIcon: ActivityIcon,
  eventThumbnail: eventThumbnail,
  eventImages: eventImages,
  eventGallery: eventGallery,
  bannerImages: bannerImages,
  partnerBannerImages:partnerBannerImages,
  newsThumbnail: newsThumbnail,
  newsImages: newsImages,
  channelIcon: channelIcon,
  locationImages: locationImages,
  helpfulLinkIcon: helpfulLinkIcon,
  PartnerIcon: PartnerIcon,
  videoCategoryImage: videoCategoryImage,
  commonImage: commonImage,
};
