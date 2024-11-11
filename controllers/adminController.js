const Product = require('../models/Product');

// Fetch all products for admin review
exports.getAllProducts = async (req, res) => {
    try {
        const products = await Product.find();
        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching products' });
    }
};

// Fetch all approved products for admin
exports.getApprovedProducts = async (req, res) => {
    try {
        const approvedProducts = await Product.find({ approvalStatus: 'approved' });
        res.json(approvedProducts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching approved products' });
    }
};

// Fetch approved products for public
exports.getApprovedProductsPublic = async (req, res) => {
    try {
        const approvedProducts = await Product.find({ approvalStatus: 'approved' });
        res.json(approvedProducts);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching approved products' });
    }
};

// Approve a product
exports.approveProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByIdAndUpdate(
            id,
            { approvalStatus: 'approved' },
            { new: true, runValidators: false }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product approved successfully', product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error approving product' });
    }
};

// Reject a product
exports.rejectProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByIdAndUpdate(
            id,
            { approvalStatus: 'rejected' },
            { new: true, runValidators: false }
        );

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product rejected successfully', product });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Error rejecting product' });
    }
};

// Delete a product
exports.deleteProduct = async (req, res) => {
    const { id } = req.params;
    try {
        const product = await Product.findByIdAndDelete(id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting product' });
    }
};
