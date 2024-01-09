const Post = require("../database/models/post");
const Topic = require("../database/models/topic");
const Group = require("../database/models/group");
const GroupMember = require("../database/models/groupMember");
const StarredTopic = require("../database/models/starredTopic");
const { manageUserLog } = require("../middleware/userActivity");
const ObjectId = require("mongoose").Types.ObjectId;
// create a topic
exports.createTopic = async (req, res) => {
  try {
    const { numberOfGroup, topics } = req.body;
    if (!req.body)
      return res
        .status(403)
        .json({ status: false, message: "please add some content !!" });
    const validGroup = await Group.find({ _id: { $in: numberOfGroup } });
    if (!validGroup)
      return res
        .status(500)
        .json({ status: false, message: "Group not found." });
    var saveData = [];
    const temp = topics.map(async (topic) => {
      const saveTopics = new Topic({ topic, numberOfGroup });
      const result = await saveTopics.save();
      saveData.push(result);
    });
    await Promise.all([...temp]);
    manageUserLog(req.admin_Id);
    return res
      .status(200)
      .json({
        status: true,
        message: "Topic created successfully!",
        data: saveData,
      });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// get all topics
exports.getAllTopics = async (req, res) => {
  try {
    const topicdata = await Topic.find({}).sort({ updatedAt: -1 });
    return res
      .status(200)
      .json({ status: true, message: "All topics!!", data: topicdata });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};
 
//get topics by individual group
exports.getAllTopicsByGroup = async (req, res) => {
  try {
    
    const { groupId } = req.params;
    if (!ObjectId.isValid(groupId)) return res
    .status(200)
    .json({ status: false, message: "Id is invalid", data: [] });

    const fetchData = await Topic.find({ numberOfGroup: { $all: [groupId] } });
    return res
      .status(200)
      .json({ status: true, message: "Topics by group", data: fetchData });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

//get topic by id
exports.getTopicById = async (req, res) => {
  try {
    const allData = await Topic.find({ _id: req.params.topicId }).populate(
      "numberOfGroup",
      "groupTitle"
    );
    if (!allData)
      return res
        .status(500)
        .json({ status: false, message: "Topics not found.", data: [] });
    return res
      .status(200)
      .json({ status: true, message: "Topics found.", data: allData });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// edit a topic
exports.editTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const { numberOfGroup, topic } = req.body;

    const validTopic = await Topic.findById(topicId);
    if (!validTopic)
      return res
        .status(500)
        .json({ status: false, message: "Topic not found." });
    //new group array check valid ids
    const validGroup = await Group.find({ _id: { $in: numberOfGroup } });
    if (!validGroup)
      return res
        .status(500)
        .json({ status: false, message: "Group not found." });

    const updateData = await Topic.findOneAndUpdate(
      { _id: topicId },
      { $set: { topic, numberOfGroup } },
      { new: true }
    );
    if (!updateData)
      return res
        .status(500)
        .json({ status: false, message: "Topic not updated!!" });
    manageUserLog(req.admin_Id);
    return res
      .status(200)
      .json({
        status: true,
        message: "Topic updated successfully!",
        data: updateData,
      });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

// delete a topic
exports.deleteTopic = async (req, res) => {
  try {
    const { topicId } = req.params;
    const topicData = await Topic.findById(topicId);
    if (!topicData)
      return res
        .status(404)
        .json({ status: false, message: "Topic not Found." });
    // delete topic id from all post topics field where used
    const findpost = await Post.find({ topics: { $all: [topicId] } });
    var temp = [];
    if (findpost.length > 0) {
      temp = findpost.map(async (item) => {
        if (item.topics.includes(topicId)) {
          await Post.findByIdAndUpdate(
            item._id,
            { $pull: { topics: topicId } },
            { new: true }
          );
        }
      });
    }
    await Promise.all([...temp]);

    await topicData.remove();
    manageUserLog(req.admin_Id);
    return res
      .status(200)
      .json({ status: true, message: "Topic deleted successfully" });
  } catch (error) {
    return res.status(500).json({ status: false, message: error.message });
  }
};

exports.starredTopic = async (req, res) => {
  try {
    const { authUserId } = req;
    const topicData = await Topic.findById(req.body.topicId);
    if (!topicData)
      return res
        .status(200)
        .json({ status: false, message: "Topic not Found." });

    const exist_starred_topic = await StarredTopic.findOne({
      topicId: req.body.topicId,
      userId: authUserId,
    });
    if (exist_starred_topic)
      return res
        .status(200)
        .json({
          status: false,
          message: "Already Starred this topic.",
          data: exist_starred_topic,
        });
    const starred_topic = new StarredTopic({
      topicId: req.body.topicId,
      userId: authUserId,
    });
    const response = await starred_topic.save();
    manageUserLog(authUserId);
    return res
      .status(200)
      .json({ status: true, message: "Starred topic.", data: response });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.removeFromStarredTopic = async (req, res) => {
  try {
    const { authUserId } = req;
    const { topicId } = req.params;
    const data = await StarredTopic.findOneAndRemove({
      topicId: topicId,
      userId: authUserId,
    });
    if (data)
      return res
        .status(200)
        .json({ status: true, message: "Remove Starred topic." });
    manageUserLog(authUserId);
    return res
      .status(200)
      .json({
        status: false,
        message: "Cann't found this topic not remove from starred list.",
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getListofStarredTopicsforUser = async (req, res) => {
  try {
    const { authUserId } = req;
    const starred_topic_list_ids = await StarredTopic.find({
      userId: authUserId,
    }).select("topicId -_id");
    var ids = starred_topic_list_ids.map((value) => {
      return value.topicId;
    });
    if (starred_topic_list_ids.length > 0) {
      const data = await Topic.find({ _id: { $in: ids } });
      return res
        .status(200)
        .json({ status: true, message: "Starred topics.", data: data });
    }
    return res
      .status(200)
      .json({ status: false, message: "Starred topics not found." });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getListofTopicbyGroupforLoginUser = async (req, res) => {
  try {
    const { authUserId } = req;
    var user_join_grp = await GroupMember.find({
      userId: authUserId,
      status: 2,
    }).select("groupId");
    var grp_ids = user_join_grp.map((x) => {
      return x.groupId.toString();
    });
    var topic_grp_vise = await Topic.find({
      numberOfGroup: { $in: grp_ids },
    }).populate("numberOfGroup", "groupTitle");
    var final_array = [];
    topic_grp_vise.map((v) => {
      v.numberOfGroup.map((g) => {
        if (grp_ids.includes(g._id.toString())) {
          var obj = {};
          obj.topic_id = v._id;
          obj.topic_name = v.topic;
          obj.totalPost = v.totalPost;
          obj.group_id = g._id;
          obj.group_name = g.groupTitle;
          final_array.push(obj);
        }
      });
    });
    return res
      .status(200)
      .json({
        status: true,
        message: "List of topics by group for login user.",
        data: final_array,
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};
