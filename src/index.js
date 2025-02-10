import dotenv from "dotenv"
import connectDB from "./db/db_connect.js"
import { app } from "./app.js"

dotenv.config({
    path: "./.env"
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


