import express from 'express';
import Product from '../models/Product.js'; // Ensure this path is correct
import upload from '../middleware/upload.js'; // Ensure this path is correct
import verifyToken from '../middleware/authMiddleware.js'; // Ensure this path is correct

const router = express.Router();

// Upload product route
router.post('/upload', verifyToken, upload.single('image'), async (req, res) => {
    const { name, price, description } = req.body;
    const imageUrl = req.file.path; // Path to the uploaded file

    try {
        const newProduct = new Product({
            name,
            price,
            description,
            image: imageUrl, // Store the image path in the product model
            sellerId: req.user.id // Link product to the logged-in seller
        });    

        await newProduct.save();
        res.status(201).json({ message: 'Product uploaded successfully', product: newProduct });
    } catch (error) {
        console.error('Product upload error:', error);
        res.status(500).json({ error: 'Error uploading product' });
    }
});

export default router;
