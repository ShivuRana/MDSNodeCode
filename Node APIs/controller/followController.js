const User = require("../database/models/airTableSync");
const FollowRequest = require("../database/models/followRequest");
const { manageUserLog } = require("../middleware/userActivity");

require("dotenv").config();

exports.sendFollowRequest = async (req, res) => {
  try {
    const authUser = req.authUserId;
    //get id of user you wann follow it
    const { followId } = req.params;
    //check if this user exist or not
    const checkUser = await User.findById(followId);
    if (!checkUser)
      return res
        .status(200)
        .json({ status: false, message: "opps this user not found !!" });
    // check if your id doesn't match the id of the user you want to follow
    if (authUser === followId) {
      return res
        .status(400)
        .json({ status: false, message: "You cannot follow yourself" });
    }

    var alreadyrequest = await FollowRequest.findOne({
      requester: authUser,
      recipient: followId,
    });
    if (alreadyrequest)
      return res
        .status(200)
        .json({ status: false, message: "You already requested this user." });

    const followRequest = new FollowRequest({
      requester: authUser,
      recipient: followId,
      status: 1,
    });
    followRequest
      .save()
      .then((result) => {
        manageUserLog(req.authUserId);
        return res
          .status(200)
          .json({ status: true, message: "Request send.", data: result });
      })
      .catch((err) => {
        return res
          .status(400)
          .json({ status: false, message: "Request error:" + err });
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.acceptFollowRequest = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const { id } = req.params;
    //check if this user exist or not
    const FollowingUser = await User.findById(id);
    if (!FollowingUser)
      return res
        .status(200)
        .json({ status: false, message: "opps this user not found !!" });
    // check if your id doesn't match the id of the user you want to follow
    if (authUser === id) {
      return res
        .status(400)
        .json({ status: false, message: "You cannot follow yourself" });
    }
    var follow_request = await FollowRequest.findOne({
      requester: id,
      recipient: authUser,
    });
    if (!follow_request)
      return res
        .status(200)
        .json({ status: false, message: "No reuest found." });
    if (follow_request.status === 2)
      return res
        .status(200)
        .json({
          status: false,
          message: "You are already following this user.",
        });

    await FollowRequest.findOneAndUpdate(
      { requester: id, recipient: authUser },
      { $set: { status: 2 } },
      { new: true }
    );
    const loginuser = await User.findByIdAndUpdate(
      authUser,
      { $push: { followers: id } },
      { new: true }
    ).select("following followers email");
    const follower_data = await User.findByIdAndUpdate(
      id,
      { $push: { following: authUser } },
      { new: true }
    ).select("following followers email");
    return res
      .status(200)
      .json({
        status: true,
        message: "Confirm follow request.",
        data: { loginuser, follower_data },
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.unfollowUser = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const { id } = req.params;
    //check if this user exist or not
    const unfollow_user = await User.findById(id);
    if (!unfollow_user)
      return res
        .status(200)
        .json({ status: false, message: "opps this user not found !!" });
    // check if your id doesn't match the id of the user you want to follow
    if (authUser === id) {
      return res
        .status(400)
        .json({ status: false, message: "You cannot unfollow yourself" });
    }
    var follow_request = await FollowRequest.findOne({
      requester: authUser,
      recipient: id,
    });
    if (!follow_request)
      return res
        .status(200)
        .json({ status: false, message: "No reuest found." });
    if (follow_request.status === 1)
      return res
        .status(200)
        .json({ status: false, message: "You are not following this user.." });

    await FollowRequest.findOneAndRemove({
      requester: authUser,
      recipient: id,
    });
    const loginuser = await User.findByIdAndUpdate(
      authUser,
      { $pull: { following: id } },
      { new: true }
    ).select("following followers email");
    const follower_data = await User.findByIdAndUpdate(
      id,
      { $pull: { followers: authUser } },
      { new: true }
    ).select("following followers email");

    return res
      .status(200)
      .json({
        status: true,
        message: "Unfollow user.",
        data: { loginuser, follower_data },
      });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.cancleFollowRequest = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const { followId } = req.params;
    const checkUser = await User.findById(followId);
    if (!checkUser)
      return res
        .status(200)
        .json({ status: false, message: "opps this user not found !!" });

    if (authUser === followId) {
      return res
        .status(400)
        .json({ status: false, message: "Not a valid request." });
    }
    var check_request = await FollowRequest.findOneAndRemove({
      requester: followId,
      recipient: authUser,
    });
    if (check_request) {
      manageUserLog(authUser);
      return res
        .status(200)
        .json({ status: true, message: "Follow request canceled." });
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Not a valid request." });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.undoFollowRequest = async (req, res) => {
  try {
    const authUser = req.authUserId;
    const { followId } = req.params;
    const checkUser = await User.findById(followId);
    if (!checkUser)
      return res
        .status(200)
        .json({ status: false, message: "opps this user not found !!" });

    if (authUser === followId) {
      return res
        .status(400)
        .json({ status: false, message: "Not a valid request." });
    }
    var check_request = await FollowRequest.findOneAndRemove({
      requester: authUser,
      recipient: followId,
    });
    if (check_request) {
      manageUserLog(authUser);
      return res
        .status(200)
        .json({ status: true, message: "Follow request canceled." });
    } else {
      return res
        .status(400)
        .json({ status: false, message: "Not a valid request." });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getFollowersbyUser = async function (req, res) {
  try {
    const authUser = req.authUserId;
    User.findOne({ _id: authUser })
      .select("followers")
      .populate("followers", "otherdetail profileImg")
      .exec((err, response) => {
        if (err) {
          return res.status(200).json({ success: false, message: err.message });
        } else if (response.followers.length === 0) {
          return res
            .status(200)
            .json({
              success: false,
              message: "This user has no followers yet",
            });
        }
        return res
          .status(200)
          .json({ success: true, message: "Followers found.", data: response });
      });
  } catch (err) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getFollowingbyUser = async function (req, res) {
  try {
    const authUser = req.authUserId;
    User.findOne({ _id: authUser })
      .select("following")
      .populate("following", "otherdetail profileImg")
      .exec((err, response) => {
        if (err) {
          return res.status(200).json({ success: false, message: err.message });
        } else if (response.following.length === 0) {
          return res
            .status(200)
            .json({
              success: false,
              message: "This user has no following yet",
            });
        }
        return res
          .status(200)
          .json({
            success: true,
            message: "Following users found.",
            data: response,
          });
      });
  } catch (err) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getlistofusers_fromloginusergetRequest = async (req, res) => {
  try {
    const authUser = req.authUserId;
    FollowRequest.find({ recipient: authUser, status: 1 })
      .populate("requester", "otherdetail profileImg")
      .populate("recipient", "otherdetail profileImg")
      .exec((err, response) => {
        if (err) {
          return res.status(200).json({ success: false, message: err.message });
        }
        return res
          .status(200)
          .json({
            success: true,
            message: "User request list.",
            data: response,
          });
      });
  } catch (err) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.getlistofusers_requestsendbyLoginuser = async (req, res) => {
  try {
    const authUser = req.authUserId;
    FollowRequest.find({ requester: authUser, status: 1 })
      .populate("requester", "otherdetail")
      .populate("recipient", "otherdetail")
      .exec((err, response) => {
        if (err) {
          return res.status(200).json({ success: false, message: err.message });
        }
        return res
          .status(200)
          .json({
            success: true,
            message: "List of request send by user.",
            data: response,
          });
      });
  } catch (err) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

async function get_follower_user_array(authUserId, memberId) {
  var member_follower_ids = await User.findOne({ _id: memberId }).select(
    "followers -_id"
  );
  var authUser_follower_ids = await User.findOne({ _id: authUserId }).select(
    "followers -_id"
  );
  var requester_ids = [];
  requester_ids = await FollowRequest.find({
    requester: authUserId,
    status: 1,
  }).select("recipient -_id");
  requester_ids = requester_ids.map((value) => {
    return value.recipient.toString();
  });

  var temp = [],
    temp1 = [],
    new_followers = [];
  var first_name = process.env.USER_FN_ID;
  var last_name = process.env.USER_LN_ID;

  if (
    member_follower_ids.followers.length > 0 ||
    authUser_follower_ids.followers.length > 0
  ) {
    temp = member_follower_ids.followers.map(async (m_id) => {
      var innerObj = {};
      var data = await User.findById(m_id).select("otherdetail profileImg -_id");
      innerObj["id"] = m_id;
      innerObj["name"] =
        data.otherdetail[first_name] + " " + data.otherdetail[last_name];
      innerObj["profileImg"] = data.profileImg;
      innerObj["request_send_byAuthUser"] = false;
      if (authUser_follower_ids.followers.includes(m_id)) {
        innerObj["follow_byAuthUser"] = true;
      } else {
        innerObj["follow_byAuthUser"] = false;
      }
      new_followers.push(innerObj);
    });
  } else {
    new_followers = member_follower_ids.followers;
  }
  await Promise.all([...temp]);
  if (requester_ids.length > 0) {
    temp1 = new_followers.map((item, i) => {
      if (requester_ids.includes(item.id.toString())) {
        new_followers[i].request_send_byAuthUser = true;
      }
    });
  }
  console.log(requester_ids, "****", new_followers);
  await Promise.all([...temp1]);
  return new_followers;
}

exports.getFollowersforMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { authUserId } = req;

    const data = await get_follower_user_array(authUserId, memberId);
    return res
      .status(200)
      .json({ success: true, message: "Followers list.", data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

async function get_following_user_array(authUserId, memberId) {
  var member_follower_ids = await User.findOne({ _id: memberId }).select(
    "following -_id"
  );
  var authUser_follower_ids = await User.findOne({ _id: authUserId }).select(
    "following -_id"
  );
  var requester_ids = [];
  requester_ids = await FollowRequest.find({
    requester: authUserId,
    status: 1,
  }).select("recipient -_id");
  requester_ids = requester_ids.map((value) => {
    return value.recipient.toString();
  });
  console.log(requester_ids);

  var temp = [],
    temp1 = [],
    new_followers = [];
  var first_name = process.env.USER_FN_ID;
  var last_name = process.env.USER_LN_ID;

  if (
    member_follower_ids.following.length > 0 ||
    authUser_follower_ids.following.length > 0
  ) {
    temp = member_follower_ids.following.map(async (m_id) => {
      var innerObj = {};
      var data = await User.findById(m_id).select("otherdetail profileImg -_id");
      innerObj["id"] = m_id;
      innerObj["name"] =
        data.otherdetail[first_name] + " " + data.otherdetail[last_name];
      innerObj["profileImg"] = data.profileImg;
      innerObj["request_send_byAuthUser"] = false;
      if (authUser_follower_ids.following.includes(m_id)) {
        innerObj["follow_byAuthUser"] = true;
      } else {
        innerObj["follow_byAuthUser"] = false;
      }
      new_followers.push(innerObj);
    });
  } else {
    new_followers = member_follower_ids.following;
  }
  await Promise.all([...temp]);

  if (requester_ids.length > 0) {
    temp1 = new_followers.map((item, i) => {
      if (requester_ids.includes(item.id.toString())) {
        new_followers[i].request_send_byAuthUser = true;
      }
    });
  }
  await Promise.all([...temp1]);
  return new_followers;
}

exports.getFollowingsforMember = async (req, res) => {
  try {
    const { memberId } = req.params;
    const { authUserId } = req;
    const data = await get_following_user_array(authUserId, memberId);
    return res
      .status(200)
      .json({ success: true, message: "Following list.", data: data });
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};

exports.searchFollowerFollowingUsers = async (req, res) => {
  try {
    const { authUserId } = req;
    const { memberId } = req.params;
    const { q, s } = req.query;
    var data = [];
    if (q === "follower") {
      data = await get_follower_user_array(authUserId, memberId);
    } else if (q === "following") {
      data = await get_following_user_array(authUserId, memberId);
    }
    if (s) {
      searchRegExp = new RegExp(s, "i");
      var result = data.filter(function (e) {
        return searchRegExp.test(e.name);
      });
      return res
        .status(200)
        .json({ success: true, message: "Search result", data: result });
    } else {
      return res
        .status(200)
        .json({ success: true, message: "Search result", data: data });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: error.message });
  }
};
