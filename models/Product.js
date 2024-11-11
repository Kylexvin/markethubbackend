import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    sellerId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User',
    },
    sellerWhatsApp: {
        type: String, // WhatsApp number
        required: false,
    },
    image: {
        type: String,
        required: true, // Ensure this matches your requirement
    },
    price: {
        type: Number,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    approvalStatus: {
        type: String,
        enum: ['pending', 'approved', 'rejected'],
        default: 'pending',
    },
}, { timestamps: true });

const Product = mongoose.model('Product', productSchema);

export default Product;
