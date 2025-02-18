import {asyncHandler} from "../utils/asyncHandler.js"
import { apiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/ApiResponse.js"
import jwt from  "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshTokens = async (userId) => {
    try {
        console.log("generating tokens for user: ", userId)
        const user = await User.findById(userId)
        if(!user){
            throw new apiError(401,"user does not exist")
        }
        
        const accessToken = user.generateAccessToken()
        const refreshToken = user.generateRefreshToken()
        console.log("accessToken : ",accessToken)

        user.refreshToken = refreshToken
        await user.save({validateBeforeSave: false})

        return {accessToken,refreshToken}

    } catch (error) {
        throw new apiError(500,"something went wrong while generating access or refresh token")
    }
}

const registerUser = asyncHandler( async (req,res) => {
    console.log("Register user function called")
    // get user details from frontend
    // check for validation - not empty
    // check if user already exists
    // check for imagees and avatar
    // upload on cloudinary
    // create user object - create entry in db
    // remove password and refresh token from response
    // check for user creation 
    // return response

    const {fullName,userName,email,password} = req.body
    console.log("email: ",email)
    // console.log(req.body)
    if([fullName,userName,email,password].some( (field) => {
        return field?.trim() === ""
    } )){
        throw new apiError(400,"all fields are required");
    }

    const existedUser = await User.findOne({
        $or: [{ userName }, { email }]
    })
    // console.log(existedUser)

    if(existedUser){
        throw new apiError(409,"user with email or username already exists")
    }

    const avatarLocalPath = req.files?.avatar[0]?.path
    //const coverLocalPath = req.files?.coverImage[0]?.path

    let coverLocalPath;
    if(req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0){
        coverLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new apiError(400,"avatar file is required")
    }

    const avatar = await uploadOnCloudinary(avatarLocalPath)
    const coverImage = await uploadOnCloudinary(coverLocalPath)

    if(!avatar){
        throw new apiError(400,"avatar file is required")
    }

    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        userName: userName.toLowerCase()
    })

    const createdUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    if(!createdUser){
        throw new apiError(500,"something went wrong while creating user")
    }

    return res.status(201).json(
        new apiResponse(200,createdUser,"user created successfully")
    )
})

const loginUser = asyncHandler( async (req,res) => {
    // extrct data from req object(email or username,password)
    // if he has access token then log him in directly(access token is short lived)
    // if his access token is expired and he has refresh token then allot him new access token and log him in
    // validation for required fields
    // find the user in database by given data
    // check for password
    // if user is not found then throw him an error and redirect him to register route
    // if user is found then log him in 
    //send cookie

    const {email,password,userName} = req.body
    console.log(email)

    if(!(userName || email)){
        throw new apiError(400,"username or email is required")
    }

    const user = await User.findOne({
        $or: [ {userName}, {email} ]
    })

    if(!user){
        throw new apiError(400,"user with this username or email does'nt exist")
    }

    const isPasswordValid = await user.isCorrectPassword(password)

    if(!isPasswordValid){
        throw new apiError(500,"wrong user credentials")
    }

    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user._id)

    const loggedInUser = await User.findById(user._id).select(
        "-password -refreshToken"
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res.status(200).cookie("accessToken",accessToken,options)
    .cookie("refreshToken",refreshToken,options)
    .json(
        new apiResponse(
            200,
            {
                user: loggedInUser,accessToken,refreshToken
            },
            "user logged In successfully"
        )
    )
} )

const logoutUser = asyncHandler(async (req,res) => {
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
            }
        },
        {
            new: true
        }
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .clearCookie("accessToken",options)
    .clearCookie("refreshToken",options)
    .json(new apiResponse(200,{},"user logged out successfully"))
})

const refreshAccessToken = asyncHandler( async(req,res) => {
   const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken

   if(!incomingRefreshToken){
    throw new apiError(401,"unauthorized request")
   }

   try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRSH_TOKEN_SECRET)
 
    const user = await User.findById(decodedToken?._id)
 
    if(!user){
     throw new apiError(401,"invalid refresh token")
    }
 
    if(incomingRefreshToken !== user?.refreshToken){
         throw new apiError(401, "Refresh token is expired or used")
    }
 
    const {accessToken,refreshToken} = await generateAccessAndRefreshTokens(user?._id)

    const options = {
        httpOnly: true,
        secure: true
    }
 
    res
    .status(200)
    .cookie("accessToken",accessToken,options)
    .cookie("refreshToken", refreshToken,options)
    .json(
         new apiResponse(200,
             {accessToken,refreshToken},
             "access token successFully refreshed"
         )
    )
   } catch (error) {
        new apiError(401,error?.message || "invalid refresh token")
   }
} )

const changeCurrentPassword = asyncHandler( async(req,res) => {
    const {oldPassword,newPassword} = req.body

    const user = await User.findById(req.user?._id)

    const isOldPasswordCorrect = await user.isCorrectPassword(oldPassword)

    if(!isOldPasswordCorrect){
        throw new apiError(400,"invalid old password")
    }

    user.password = newPassword
    await user.save({validateBeforeSave: false})

    return res.status(200).json(new apiResponse(200,{},"password changed successfully"))
} )

const getCurrentUser = asyncHandler( async(req,res) => {
    res.status(200).json(
        new apiResponse(200,req.user,"current user fetched successfully")
    )
} )

const updateAccountDetails = asyncHandler(async(req,res) => {
    const {fullName,email} = req.body

    if(!fullName || !email){
        throw new apiError(400,"all fields are required")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                fullName,
                email
            }
        },
        {new: true}
    ).select("-password")

    res.status(200).json(new apiResponse(200,user,"user details updated successfully"))
})

const updateUserAvatar = asyncHandler( async(req,res) => {
    const avatarLocalPath = req.file?.path

    if(!avatarLocalPath){
        throw new apiError(400,"avatar file is missing")
    }

    // TODO: delete the old avatar file after uploading new file

    const avatar = await uploadOnCloudinary(avatarLocalPath)

    if(!avatar.url){
        throw new apiError(500,"error while uploading avatar file")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    res.status(200).json(new apiResponse(200,user,"user avatar updated successfully"))
} )

const updateUserCoverImage = asyncHandler( async(req,res) => {
    const coverImageLocalPath = req.file?.path

    if(!coverImageLocalPath){
        throw new apiError(400,"coverImage file is missing")
    }

    const coverImage = await uploadOnCloudinary(coverImageLocalPath)

    if(!coverImage.url){
        throw new apiError(500,"error while uploading coverImage file")
    }

    const user = await User.findByIdAndUpdate(req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    res.status(200).json(new apiResponse(200,user,"user avatar updated successfully"))
} )

const getUserChannelProfile = asyncHandler( async(req,res)=>{
    const {userName} = req.params

    if(!userName){
        throw new apiError(400,"username is missing")
    }

    const channel =  await User.aggregate([
        {
            $match: {
                userName: userName?.toLowerCase
            }
        },
        {
            $lookup: {
                from: "Subscription",
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "Subscription",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {
                subscriberCount: {
                    $size: "$subscribers",
                },
                channelsSubscribedToCount: {
                    $size: "$subscribedTo"
                },
                isSubscribed: {
                    $cond: {
                        if: {$in: [req.user?._id,"$subscribers.subcriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                fullName: 1,
                userName: 1,
                avatar: 1,
                coverImage: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                email: 1
            }
        }

    ])

    if(!channel?.length){
        throw new apiError(400,"channel does not exist")
    }

    res.status(200).json(
        new apiResponse(200,channel[0],"user channel fetched successfully")
    )
} )

const getWatchHistory = asyncHandler( async(req,res) => {
    const user = User.aggregate([
        {
            $match: {
                _id: mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "Video",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        $lookup: {
                            from: "User",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullName: 1,
                                        userName: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"
                            }
                        }
                    }
                ]
            }
        }
    ])

    return res.status(200).json(new apiResponse(200,user[0].watchHistory,"watch history fetched successfully"))
} )

export {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory,
}