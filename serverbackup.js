import express from 'express';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import cors from 'cors';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import fs from 'fs';
import User from './models/user.js';
import Product from './models/Product.js';
import { verifyToken, isAdmin } from './middleware/authMiddleware.js';

// Load environment variables from .env file
dotenv.config();

// Initialize the Express app
const app = express();

// Middleware to parse JSON
app.use(express.json());

// Enable CORS for frontend access
app.use(cors());

// Create uploads directory if it doesn't exist
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Set up multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    },
});
const upload = multer({ storage });

// Serve the uploads folder as a static directory
app.use('/uploads', express.static(uploadDir));

// Connect to MongoDB with retry on failure
async function connectDB() {
    try {
        console.log("Attempting to connect to MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('Connected to MongoDB');
    } catch (error) {
        console.error('MongoDB connection error:', error.message);
        setTimeout(connectDB, 5000);
    }
}
connectDB();

// Registration route
app.post('/api/auth/register', async (req, res) => {
    const { username, phone, email, password, role } = req.body;

    try {
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = new User({ 
            username, 
            phone, 
            email, 
            password: hashedPassword, 
            role: role || 'seller' 
        });
        await newUser.save();

        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Error registering user' });
    }
});

// Login route with refresh token
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = await User.findOne({ email });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(400).json({ error: 'Invalid email or password' });
        }

        // Generate access token (short-lived)
        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        // Generate refresh token (long-lived)
        const refreshToken = jwt.sign(
            { id: user._id },
            process.env.REFRESH_TOKEN_SECRET || 'refresh-secret',
            { expiresIn: '7d' }
        );

        // Save refresh token to user document
        user.refreshToken = refreshToken;
        await user.save();

        res.status(200).json({
            message: 'Login successful',
            accessToken,
            refreshToken,
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Error logging in' });
    }
});

// Refresh token route
app.post('/api/auth/refresh', async (req, res) => {
    const { refreshToken } = req.body;

    if (!refreshToken) {
        return res.status(401).json({ error: 'Refresh token required' });
    }

    try {
        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET || 'refresh-secret');
        const user = await User.findOne({ _id: decoded.id, refreshToken });

        if (!user) {
            return res.status(401).json({ error: 'Invalid refresh token' });
        }

        // Generate new access token
        const accessToken = jwt.sign(
            { id: user._id, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.status(200).json({ accessToken });
    } catch (error) {
        console.error('Refresh token error:', error);
        res.status(401).json({ error: 'Invalid refresh token' });
    }
});

// Logout route
app.post('/api/auth/logout', verifyToken, async (req, res) => {
    try {
        // Clear refresh token in database
        const user = await User.findById(req.user.id);
        user.refreshToken = null;
        await user.save();

        res.status(200).json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Error logging out' });
    }
});

// Protected Seller Dashboard route
app.get('/api/seller/dashboard', verifyToken, async (req, res) => {
    res.status(200).json({ message: 'Welcome to the seller dashboard!', user: req.user });
});

// Admin Dashboard Route
app.get('/api/admin/dashboard', verifyToken, isAdmin, (req, res) => {
    res.status(200).json({ message: 'Welcome to the admin dashboard!' });
});

// Create Product
app.post('/api/products/upload', verifyToken, upload.single('image'), async (req, res) => {
    const { name, price, description } = req.body;
    const imageUrl = req.file?.path;

    if (!name || !price || !description || !imageUrl) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    try {
        const user = await User.findById(req.user.id);
        
        if (!user || !user.phone) {
            return res.status(400).json({ error: 'Seller not found or phone number missing' });
        }

        const newProduct = new Product({
            name,
            sellerId: req.user.id,
            sellerWhatsApp: user.phone,
            image: imageUrl,
            price,
            description,
            approvalStatus: 'pending',
        });

        await newProduct.save();
        res.status(201).json({ message: 'Product uploaded successfully', product: newProduct });
    } catch (error) {
        console.error('Error uploading product:', error);
        res.status(500).json({ error: 'Error uploading product' });
    }
});

// Get Seller's Own Products
app.get('/api/seller/my-products', verifyToken, async (req, res) => {
    try {
        const products = await Product.find({ 
            sellerId: req.user.id,
            approvalStatus: 'approved'
        })
        .sort({ createdAt: -1 })
        .select('-sellerWhatsApp');

        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching seller products:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});

// Get All Approved Products - Public Route
app.get('/api/products/approved', async (req, res) => {
    try {
        const products = await Product.find({ approvalStatus: 'approved' })
            .sort({ createdAt: -1 })
            .populate('sellerId', 'phone username');
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching approved products:', error);
        res.status(500).json({ error: 'Error fetching approved products' });
    }
});

// Get All Products (Public)
app.get('/api/products', async (req, res) => {
    try {
        const products = await Product.find({ approvalStatus: 'approved' })
            .sort({ createdAt: -1 })
            .populate('sellerId', 'phone username');
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching products:', error);
        res.status(500).json({ error: 'Error fetching products' });
    }
});

// Admin Routes

// Get Approved Products
app.get('/api/admin/products/approved', verifyToken, isAdmin, async (req, res) => {
    try {
        const products = await Product.find({ approvalStatus: 'approved' })
            .sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching approved products:', error);
        res.status(500).json({ error: 'Error fetching approved products' });
    }
});

// Get Rejected Products
app.get('/api/admin/products/rejected', verifyToken, isAdmin, async (req, res) => {
    try {
        const products = await Product.find({ approvalStatus: 'rejected' })
            .sort({ createdAt: -1 });
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching rejected products:', error);
        res.status(500).json({ error: 'Error fetching rejected products' });
    }
});

// Delete Rejected Products
app.delete('/api/admin/products/rejected', verifyToken, isAdmin, async (req, res) => {
    try {
        const result = await Product.deleteMany({ approvalStatus: 'rejected' });

        if (result.deletedCount === 0) {
            return res.status(404).json({ message: 'No rejected products found to delete' });
        }

        res.status(200).json({ message: `${result.deletedCount} rejected products deleted successfully` });
    } catch (error) {
        console.error('Error deleting rejected products:', error);
        res.status(500).json({ error: 'Error deleting rejected products' });
    }
});

// Fetch All Users - Admin Only
app.get('/api/admin/users', verifyToken, isAdmin, async (req, res) => {
    try {
        const users = await User.find()
            .sort({ createdAt: -1 })
            .select('-password -refreshToken');
        res.status(200).json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Error fetching users' });
    }
});

// Update Product
app.put('/api/products/:id', verifyToken, async (req, res) => {
    const { id } = req.params;
    const { name, image, price, description } = req.body;

    try {
        const product = await Product.findById(id);

        if (!product || product.sellerId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to update this product' });
        }

        product.name = name;
        product.image = image;
        product.price = price;
        product.description = description;
        // Reset approval status when product is updated
        product.approvalStatus = 'pending';

        await product.save();
        res.status(200).json({ message: 'Product updated successfully', product });
    } catch (error) {
        console.error('Error updating product:', error);
        res.status(500).json({ error: 'Error updating product' });
    }
});

// Delete Product
app.delete('/api/products/:id', verifyToken, async (req, res) => {
    const { id } = req.params;

    try {
        const product = await Product.findById(id);

        if (!product || product.sellerId.toString() !== req.user.id) {
            return res.status(403).json({ error: 'Unauthorized to delete this product' });
        }

        // Delete the image file if it exists
        if (product.image) {
            const imagePath = product.image;
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
            }
        }

        await Product.findByIdAndDelete(id);
        res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Error deleting product:', error);
        res.status(500).json({ error: 'Error deleting product' });
    }
});

// Admin Approve/Reject Product
app.put('/api/admin/products/:id', verifyToken, isAdmin, async (req, res) => {
    const { id } = req.params;
    const { approvalStatus } = req.body;

    try {
        const product = await Product.findById(id);

        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        product.approvalStatus = approvalStatus;
        await product.save();

        res.status(200).json({ message: `Product ${approvalStatus} successfully`, product });
    } catch (error) {
        console.error('Error updating product approval status:', error);
        res.status(500).json({ error: 'Error updating product approval status' });
    }
});

// Get Pending Products for Approval
app.get('/api/admin/products/pending', verifyToken, isAdmin, async (req, res) => {
    try {
        const products = await Product.find({ approvalStatus: 'pending' })
            .sort({ createdAt: -1 })
            .populate('sellerId', 'username email phone');
        res.status(200).json(products);
    } catch (error) {
        console.error('Error fetching pending products:', error);
        res.status(500).json({ error: 'Error fetching pending products' });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});