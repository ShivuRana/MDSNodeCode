"use strict";
const express = require("express");
const route = new express.Router();

const {
  addfieldsregistrationform,
  retrivefieldsregistrationform,
  deletefieldregistrationform,
  updatefieldregistrationform,
} = require("../../controller/userManagement/customregistrationformController");

route.post("/addfieldsregistrationform", addfieldsregistrationform);
route.get("/retrivefieldsregistrationform", retrivefieldsregistrationform);
route.post("/deletefieldregistrationform", deletefieldregistrationform);
route.post("/updatefieldregistrationform", updatefieldregistrationform);

module.exports = route;
