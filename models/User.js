import mongoose from 'mongoose'; 

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  phone: {
    type: String,
    required: true,
  },
  email: {
    type: String, 
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  role: {  
    type: String,
    enum: ['seller', 'admin'], // Define valid roles
    default: 'admin', // Change default role to 'admin'
  },
}, { timestamps: true });

const User = mongoose.model('User', userSchema); // This will create a collection named 'users'
export default User;
