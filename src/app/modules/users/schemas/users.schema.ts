import mongoose, { Model, Schema  } from "mongoose";
import type { IUser } from "../interfaces/user.interface.ts";
import bcrypt from "bcryptjs";
import type { NextFunction } from "express";

const UserSchema = new Schema<IUser>({
    userName : {
        type : String,
        required: [true, "Name is required"],
        lowercase: true , 
        minlength: [2, "Name must be at least 2 characters"],
        maxlength: [50, "Name must be less than 50 characters"],
        trim:true,
        index: true
    },
    fullName : {
        type : String,
        required: [true, "Full Name is required"],
        lowercase: true , 
        minlength: [2, "Name must be at least 2 characters"],
        maxlength: [50, "Name must be less than 50 characters"],
        trim:true,
        index: true
    },
    email: {
        type: String,
        required: [true, "Email is required"],
        unique: true,
        lowercase: true,
        trim: true,
        index: true,
        match: [/^\S+@\S+\.\S+$/, "Invalid email format"],
    },
    avatar:{
        type : String,
        required:true
    },
    watchHistory : [
        {
            type: Schema.Types.ObjectId,
            ref : "Video"
        }
    ],
    role: {
        type: String,
        enum: ["user", "admin"],
        default: "user",
    },
    password: {
        type: String,
        required: [true, "Password is required"],
        minlength: [8, "Password must be at least 8 characters"],
        select: false,
    },
    refreshToken: {
        type: String,
        select: false,
        default: null,
    },
    isActive: {
        type: Boolean,
        default: true,
    },   
},
{
    timestamps: true,
    versionKey: false,
})


// UserSchema.pre<IUser>("save", async function (next : NextFunction) {
//     if (!this.isModified("password")) return next();
  
//     const salt = await bcrypt.genSalt(12);
//     this.password = await bcrypt.hash(this.password, salt);
  
//     next();
// });

export const User : Model<IUser> = mongoose.model("User", UserSchema)