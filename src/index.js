import dotenv from "dotenv"
import express from 'express'
import connectDB from "./db/db_connect.js"

dotenv.config({
    path: "./env"
})

connectDB()

const app = express()

