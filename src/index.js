import dotenv from "dotenv"
import express from 'express'
import connectDB from "./db/db_connect.js"

dotenv.config({
    path: "./env"
})

connectDB()
.then(() => {
    app.on("error", (err) => {
        console.log("ERROR: ", err)
    })
    app.listen(process.env.PORT || 8000, () =>{
        console.log("app listening on port: ", process.env.PORT)
    })
})
.catch((err) => {
    console.log("MONGODB connection error !!! : ",err)
})

const app = express()

