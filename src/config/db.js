import mongoose from "mongoose"

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("MongoDb Connected")
    } catch (error) {
        console.log("Database error: ", error.message);
        process.exis(1);
    }
}

export default connectDb