const User = require("../database/models/airTableSync");
const Post = require("../database/models/post");
const Topic = require("../database/models/topic");
const GroupMember = require("../database/models/groupMember");
const Group = require("../database/models/group");

const { ObjectId } = require("mongodb");

// exports.listOfJoinGroup_authUser = async (req, res) => {
//   try {
//     const { userId } = req.params;
//     const result = await GroupMember.aggregate([
//       {
//         $lookup: {
//           from: "users",
//           localField: "userId",
//           foreignField: "_id",
//           as: "user",
//         },
//       },
//       { $unwind: "$user" },
//       {
//         $lookup: {
//           from: "groups",
//           localField: "groupId",
//           foreignField: "_id",
//           as: "group",
//         },
//       },
//       { $unwind: "$group" },
//       { $match: { "user._id": ObjectId(userId), "group.isDelete": false } },
//       {
//         $project: {
//           group_id: "$group._id",
//           group_name: "$group.groupTitle",
//           group_image: "$group.groupImage",
//           group_total_member: "$group.totalGrpMember",
//           _id: 0,
//         },
//       },
//     ]);
//     return res
//       .status(201)
//       .send({ status: true, message: "Search list.", data: result });
//   } catch (error) {
//     return res
//       .status(200)
//       .json({
//         status: false,
//         message: `Something went wrong. ${error.message}`,
//       });
//   }
// };


exports.accessibleTopicsListForAuthUser = async (req, res) => {
  try {
    const { authUserId } = req

    const result = await User.aggregate([
      {
        $match: {
          _id: ObjectId(authUserId),
          isDelete: false,
          register_status: true,
          personalDetail_status: true,
          payment_status: true,
          QA_status: true,
          active: true,
        }
      },
      {
        $unwind: "$accessible_groups"
      },
      {
        $lookup: {
          from: 'topics',
          let: {
            id: "$accessible_groups"
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$$id", "$numberOfGroup"] }
              },
            }
          ],
          as: "topic_data"
        }
      },
      {
        $unwind: "$topic_data"
      },
      {
        $project: {
          _id: 0,
          accessible_groups: 1,
          topic_id: "$topic_data._id",
          topic_name: "$topic_data.topic"
        }
      }
    ])

    if (result.length > 0) {
      return res.status(200).json({ status: true, message: "Topic list found.", data: result })
    } else {
      return res.status(400).json({ status: false, message: "Data not valid." })
    }

  } catch (error) {
    return res.status(400).json({ status: false, message: "Something went wrong" })
  }
};

exports.loginUserFriendsList = async (req, res) => {
  try {
    const { authUserId } = req

    const result = await User.aggregate([
      {
        $match: {
          _id: ObjectId(authUserId),
          isDelete: false,
          register_status: true,
          personalDetail_status: true,
          payment_status: true,
          QA_status: true,
          active: true,
        }
      },
      {
        $addFields: {
          friends: {
            $setIntersection: ["$following", "$followers"]
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          let: {
            id: "$friends"
          },
          pipeline: [
            {
              $match: {
                $expr: { $in: ["$_id", "$$id"] }
              },
            }
          ],
          as: "user_data"
        }
      },
      {
        $unwind: "$user_data"
      },
      {
        $project: {
          _id: 0,
          user_id: "$user_data._id",
          email: "$user_data.email",
          profileImg: "$user_data.profileImg",
          otherdetail: "$user_data.otherdetail"
        }
      }
    ])

    if (result.length > 0) {
      return res.status(200).json({ status: true, message: "User friends list found.", data: result })
    } else {
      return res.status(400).json({ status: false, message: "Data not found." })
    }

  } catch (error) {
    return res.status(400).json({ status: false, message: "Something went wrong", error })
  }
};

exports.globalSearchStage1 = async (req, res) => {
  try {
    const { authUserId } = req
    const { s, topic, user } = req.query
    const result = await User.aggregate([
      {
        $match: {
          _id: ObjectId(authUserId),
          isDelete: false,
          register_status: true,
          personalDetail_status: true,
          payment_status: true,
          QA_status: true,
          active: true,
        }
      },
      {
        $unwind: "$accessible_groups"
      },
      {
        $lookup: {
          from: 'posts',
          let: {
            id: "$accessible_groups"
          },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ["$groupId", "$$id"] }
              },
            },
            { $unwind: "$topics" },
            {
              $lookup: {
                from: "topics",
                let: { idT: "$topics" },
                pipeline: [
                  {
                    $match: {
                      $expr: { $eq: ["$_id", "$$idT"] }
                    }
                  },
                ],
                as: "topics"
              }
            },
            { $unwind: "$topics" },
            {
              $match: {
                $or: [
                  {
                    "description": { $regex: s }
                  },
                  {
                    "topics.topic": { $regex: s }
                  }
                ]
              }
            },
          ],
          as: "posts_data"
        }
      },
      { $group: { _id: "$_id", posts: { $push: "$posts_data" } } },
      {
        $project: {
          _id: 0,
          posts: {
            $reduce: {
              input: "$posts",
              initialValue: [],
              in: { $concatArrays: ["$$value", "$$this"] }
            }
          }
        }
      },
      { $unwind: "$posts" },
      {
        $replaceRoot:
          { newRoot: "$posts" }
      },
      {
        $group: {
          _id: {
            id: "$_id",
            // user_type: "$user_type",
            // postedBy: "$postedBy",
            // groupId: "$groupId",
            description: "$description",
            // thumbnail_images: "$thumbnail_images",
            // medium_images: "$medium_images",
            // images: "$images",
            // videos: "$videos",
            // likes: "$likes",
            // comments: "$comments",
            // feelingsActivity: "$feelingsActivity",
            // pollChoices: "$pollChoices",
            // pollDuration: "$pollDuration",
            // pollTotalVotes: "$pollTotalVotes",
            // postStatus: "$postStatus",
            // tagAFriend: "$tagAFriend",
            // postType: "$postType",
            // makeAnnouncement: "$makeAnnouncement",
            // hideFromFeed: "$hideFromFeed",
            // isDelete: "$isDelete",
            // createdAt: "$createdAt",
            // updatedAt: "$updatedAt",
            // share_count: "$share_count",
          },
          topics: { $push: "$topics" }
        }
      },
      {
        $project: {
          posts: {
            id: "$_id.id",
            // user_type: "$_id.user_type",
            // postedBy: "$_id.postedBy",
            // groupId: "$_id.groupId",
            description: "$_id.description",
            topics: "$topics",
            // thumbnail_images: "$_id.thumbnail_images",
            // medium_images: "$_id.medium_images",
            // images: "$_id.images",
            // videos: "$_id.videos",
            // likes: "$_id.likes",
            // comments: "$_id.comments",
            // feelingsActivity: "$_id.feelingsActivity",
            // pollChoices: "$_id.pollChoices",
            // pollDuration: "$_id.pollDuration",
            // pollTotalVotes: "$_id.pollTotalVotes",
            // postStatus: "$_id.postStatus",
            // tagAFriend: "$_id.tagAFriend",
            // postType: "$_id.postType",
            // makeAnnouncement: "$_id.makeAnnouncement",
            // hideFromFeed: "$_id.hideFromFeed",
            // isDelete: "$_id.isDelete",
            // createdAt: "$_id.createdAt",
            // updatedAt: "$_id.updatedAt",
            // share_count: "$_id.share_count",
          },
          _id: 0,
        }
      },
      {
        $replaceRoot:
          { newRoot: "$posts" }
      },
    ])

    const only_ids = result.map((item) => {
      return item.id
    })


    if (only_ids.length > 0) {

      let final_result = []

      let matchCond = {
        _id: { $in: only_ids },
        makeAnnouncement: false,
        hideFromFeed: false,
        isDelete: false
      }
      if (user) {
        matchCond.postedBy = ObjectId(user)
      }
      if (topic) {
        matchCond.topics = { $in: ObjectId(topic) }
      }

      final_result = await Post.find(matchCond)
        .populate({ path: "groupId", select: "groupTitle" })
        .sort({ updatedAt: -1 })

      if (result.length > 0) {
        return res.status(200).json({ status: true, message: "Glober search result found.", data: final_result })
      } else {
        return res.status(400).json({ status: false, message: "Data not found.", data: [] })
      }
    } else {
      return res.status(400).json({ status: false, message: "Data not found.", data: [] })
    }

  } catch (error) {
    return res.status(400).json({ status: false, message: "Something went wrong", error })
  }
}; 