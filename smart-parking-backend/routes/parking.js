const express = require("express");
const router = express.Router();
const parkingController = require("../controllers/parkingController");

router.post("/", parkingController.createParkingRecord);
router.get("/", parkingController.getParkingRecords);

module.exports = router;
