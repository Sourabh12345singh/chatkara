import mongoose from "mongoose";

export async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGODB_URI as string);
  } catch (error: any ) {
    console.error("MongoDB connection failed:", error.message );
    process.exit(1);
  }
}
