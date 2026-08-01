const express = require("express");
const router = express.Router();
const {
  createCallbackRequest,
  getAllCallbackRequests,
  updateCallbackRequest,
} = require("../controller/callbackRequest.controller");
const { isAuth, accessToRole } = require("../middleware/auth");
const validate = require("../middleware/validate");
const { idParam } = require("../validators/common");
const {
  createCallbackRequestSchema,
  updateCallbackRequestSchema,
} = require("../validators/callbackRequest.validator");

// Public - Course detail page "Request a Callback" form
router.post("/create", validate(createCallbackRequestSchema), createCallbackRequest);

// Admin/Super Admin
router.get("/", isAuth, accessToRole(["admin", "superadmin"]), getAllCallbackRequests);

router.put(
  "/:id",
  isAuth,
  accessToRole(["admin", "superadmin"]),
  validate(idParam, "params"),
  validate(updateCallbackRequestSchema),
  updateCallbackRequest
);

module.exports = router;
