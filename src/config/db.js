import mongoose from "mongoose"
import logger from "../utils/logger.js";

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        logger.info("MongoDb Connected")
    } catch (error) {
        logger.error(`Database error: ${error.message}`);
        process.exit(1);
    }
}

export default connectDb