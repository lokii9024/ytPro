import {asyncHandler} from "../utils/asyncHandler.js"
import { apiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { apiResponse } from "../utils/ApiResponse.js"

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

export {registerUser}