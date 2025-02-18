import { Router } from "express";
import {registerUser,loginUser,logoutUser,refreshAccessToken,changeCurrentPassword,updateAccountDetails,updateUserAvatar,updateUserCoverImage,getCurrentUser,getUserChannelProfile,getWatchHistory} from "../controllers/user.controller.js"
const router = Router()
import {upload} from "../middlewares/multer.middleware.js"
import { verifyJWT } from "../middlewares/auth.middleware.js";

router.route("/register").post(
    upload.fields([
        {
            name: "avatar",
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ])
    ,registerUser)

router.route("/login").post(loginUser)

//secured routes
router.route("/logout").post(verifyJWT,logoutUser)
router.route("/refresh-Token").post(refreshAccessToken)
router.route("/change-password").post(verifyJWT,changeCurrentPassword)
router.route("/update-details").patch(verifyJWT,updateAccountDetails)
router.route("/update-avatar").patch(verifyJWT,upload.single("avatar"),updateUserAvatar)
router.route("/update-coverImage").patch(verifyJWT,upload.single("coverImage"),updateUserCoverImage)
router.route("/getCurrentUser").get(verifyJWT,getCurrentUser)
router.route("/c/:userName").get(verifyJWT,getUserChannelProfile)
router.route("/getWatchHistory").get(verifyJWT,getWatchHistory)
export default router