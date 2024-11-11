import mongoose from 'mongoose';
import User from './models/user.js';
import dotenv from 'dotenv';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error);
    }
};

const updateUsers = async () => {
    try {
        await User.updateMany({}, { $set: { role: 'seller' } });
        console.log('Updated all users to have role: seller');
    } catch (error) {
        console.error('Error updating users:', error);
    } finally {
        mongoose.connection.close();
    }
};

const main = async () => {
    await connectDB();
    await updateUsers();
};

main();
