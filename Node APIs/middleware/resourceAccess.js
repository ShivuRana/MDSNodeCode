const User = require("../database/models/airTableSync");
const Group = require("../database/models/group");
const MembershiPlan = require("../database/models/membershipPlanManagement/membership_plan");

const checkGroup_userCanAccessResource = async (
  userId,
  group_id,
  user_type = ""
) => {
  return new Promise(async (resolve, reject) => {
    try {
      if (user_type === "user" || userId) {
        var user_access_grps = await User.findById(userId).select(
          "accessible_groups"
        );
        var user_access_grps_ids = user_access_grps.accessible_groups.map(
          (grpid) => {
            return grpid.toString();
          }
        );
        const groupData = await Group.findOne({
          _id: group_id,
          isDelete: false,
        });
        if (!groupData) reject("Group not Found.");
        var plandata = await MembershiPlan.findOne({
          total_member_who_purchased_plan: { $in: userId },
          isDelete: false,
        });
        var group_ids = plandata.plan_resource.group_ids.map((item) => {
          return item.toString();
        });
        var final_group_ids = [
          ...new Set([...user_access_grps_ids, ...group_ids]),
        ];
        if (plandata) {
          if (final_group_ids.includes(group_id)) {
            resolve(group_id);
          } else {
            reject(
              `Please upgrade your plan. currenlt plan not access this group.`
            );
          }
        } else {
          reject(`User not purchased plan yet.`);
        }
      } else {
        resolve();
      }
    } catch (error) {
      console.log(error);
      reject(`Something went wrong when trying to access resource.`);
    }
  });
};

module.exports = { checkGroup_userCanAccessResource };
