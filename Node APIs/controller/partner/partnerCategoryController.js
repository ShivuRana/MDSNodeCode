  const { ObjectId } = require("mongodb");
  const { deleteImage } = require("../../utils/mediaUpload");
  const PartnerCategory = require("../../database/models/partner/partner_category");
  const partnerSubCategory = require("../../database/models/partner/partner_subcategory");

exports.createCategoty = async (req, res) => {
    try {
      const subCatagoryArray = (req.body.subcategory !== undefined && req.body.subcategory !== null && req.body.subcategory !== "") ? req.body.subcategory.split(",") : []
      const isPartnerCategoryExist = await PartnerCategory.find({name: req.body.name,isDelete: false});
      if (isPartnerCategoryExist && isPartnerCategoryExist.length>0) {
        return res.status(200).json({ status: false, message: `Category name must be unique.` });
      }
      let subCategory = [];
      var subCategoryData = subCatagoryArray.map(async (item, index) => {
        if (await partnerSubCategory.findOne({ name: item, isDelete: false }))
          return res.status(200).json({status: false,message: `Sub Category name must be unique.`});
  
        const addSubCategory = new partnerSubCategory({ name: item });
        const subResult = await addSubCategory.save();
        subCategory.push(subResult._id);
      });
      await Promise.all([...subCategoryData]);
  
      const addPartnerCategory = new PartnerCategory({
        name: req.body.name,
        categoryImage: req.categoryImage,
        subcategory: subCategory,
      });
      const result = await addPartnerCategory.save();
      return res.status(200).json({ status: true, message: `Category created.`, data: result });
    } catch (error) {
      if (error.name === "MongoServerError" && error.code === 11000) {
        return res.status(200).json({ status: false, message: `Category name must be unique.` });
      } else {
        return res.status(200).json({ status: false, message: `Something went wrong. ${error}` });
      }
    }
  };
  
  exports.deleteCategory = async (req, res) => {
    try {
      const { id } = req.params;
      const updatedData = await PartnerCategory.findByIdAndUpdate(id,{ isDelete: true },{ new: true }).select("-__v -createdAt -updatedAt");
      if (updatedData && updatedData.subcategory) {
        await partnerSubCategory.deleteMany({ _id: { $in: updatedData.subcategory } });
          partnerSubCategory.remove({
            _id: { $in: [...updatedData.subcategory] },
          });
      }
      return res.status(200).json({ status: true, message: `Category deleted.`, data: updatedData });
    } catch (error) {
      return res.status(200).json({ status: false, message: `${error.message}` });
    }
  };
  
exports.getCategoriesList_as = async (req, res) => {
    try {
      const partnerCategorydata = await PartnerCategory.aggregate([
        {
          $match: {
            isDelete: false,
          },
        },
        {
          $lookup: {
            from: "partner_subcategories",
            localField: "subcategory",
            foreignField: "_id",
            pipeline: [
              {
                $match: {
                  isDelete: false,
                },
              },
            ],
            as: "subcategory",
          },
        },
        {
          $project: {
            _id: 1,
            name: 1,
            categoryImage:1,
            isDelete:1,
            "subcategory": {name:1,_id:1,isDelete:1}   
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ]);
      return res.status(200).json({ status: true, message: `List of categories.`, data: partnerCategorydata });
    } catch (error) {
      return res.status(200).json({ status: false, message: `${error.message}` });
    }
  };
  
  exports.editCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const isPartnerCategoryExist = await PartnerCategory.find({_id: { $ne: ObjectId(id) },name: req.body.name,isDelete: false});
    if (isPartnerCategoryExist && isPartnerCategoryExist.length > 0) {
      return res.status(200).json({ status: false, message: `Category name must be unique.` });
    }
    const subCategoryArray = req.body.subcategory !== undefined && req.body.subcategory !== null && req.body.subcategory.length > 0 ? req.body.subcategory.trim().split(",") : []
    // update subcategory
    var partnerSubCategoryIds=[]
    if(!req.body.subcategory){
      partnerSubCategoryIds = [];
    }
    else{
      var subcategoryData = req.body.subcategory !== undefined
        && req.body.subcategory !== null
        && req.body.subcategory.length > 0 && subCategoryArray.map(async (item, index) => {
          const partnerSubCategoryDataExist = await partnerSubCategory.findOne({ name: item, isDelete: false })
          if (partnerSubCategoryDataExist){
            partnerSubCategoryIds.push(partnerSubCategoryDataExist._id)
          }
          else{
            const addPartnerSubCategory = new partnerSubCategory({ name: item });
            const subResult = await addPartnerSubCategory.save();
            partnerSubCategoryIds.push(subResult._id)
          }
        });
        await Promise.all([...subcategoryData]);
    }
    await PartnerCategory.findByIdAndUpdate(id,{subcategory: partnerSubCategoryIds},{ new: true });
    
    // update img
    const catExists = await PartnerCategory.findById(ObjectId(id))
    if (catExists && catExists.categoryImage !== undefined && catExists.categoryImage !== null)
      deleteImage(catExists.categoryImage)
    const updatedData = await PartnerCategory.findByIdAndUpdate(id,{ name: req.body.name, categoryImage: req.categoryImage ? req.categoryImage : catExists.categoryImage },{ new: true });
    return res.status(200).json({status: true,message: `Category updated successfully.`,data: updatedData});
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};

exports.getCategorybyId = async (req, res) => {
  try {
    const { id } = req.params;
    if (ObjectId.isValid(id)) {
      const data = await PartnerCategory.findOne({_id: id,isDelete: false,}).select("-__v -createdAt -updatedAt");
      return res.status(200).json({ status: true, message: `Category data.`, data: data });
    } else {
      return res.status(200).json({ status: false, message: `Id is invalid`, data: [] });
    }
  } catch (error) {
    return res.status(200).json({ status: false, message: `${error.message}` });
  }
};
