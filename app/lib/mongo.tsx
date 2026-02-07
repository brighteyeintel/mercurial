import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME;

export async function dbConnect() {
  if (!MONGODB_URI) {
    throw new Error('Please define the MONGODB_URI environment variable');
  }
  await mongoose.connect(MONGODB_URI, { dbName: MONGODB_DB_NAME });
  return mongoose;
}