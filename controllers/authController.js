// backend/controllers/authController.js
import User from "../models/user.js"; // Ensure the filename is correct (case-sensitive)
import bcrypt from 'bcryptjs';
import jwt from "jsonwebtoken";
 
// Register user
export const register = async (req, res) => {
  const { username, password, role } = req.body;

  try {
    // Check if user already exists
    const existingUser = await User.findOne({ username });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create a new user
    const user = new User({
      username,
      password: hashedPassword,
      role: role || "seller", // Set default role to seller
    });

    // Save the user to the database
    const savedUser = await user.save();
    res.status(201).json({ success: true, message: "User registered successfully", user: savedUser });
  } catch (error) {
    console.error("Registration error:", error); // Log the error for debugging
    res.status(500).json({ success: false, message: "Error during registration", error: error.message });
  }
};

// Login user
export const login = async (req, res) => {
  const { username, password } = req.body;

  try {
    // Find the user by username
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Check if the password matches
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid credentials" });
    }

    // Generate token
    const token = jwt.sign(
      { _id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({ success: true, token });
  } catch (error) {
    console.error("Login error:", error); // Log the error for debugging
    res.status(500).json({ success: false, message: "Error during login", error: error.message });
  }
};

// Get user profile
export const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password'); // Exclude password from response
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, user });
  } catch (error) {
    console.error("Profile retrieval error:", error); // Log the error for debugging
    res.status(500).json({ success: false, message: "Error retrieving user profile", error: error.message });
  }
};

// Update user details
export const updateUser = async (req, res) => {
  try {
    const { username, password, role } = req.body;

    // Check if the user exists
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update fields if provided
    if (username) user.username = username;
    if (password) user.password = await bcrypt.hash(password, 10); // Hash new password
    if (role) user.role = role;

    const updatedUser = await user.save();
    res.json({ success: true, message: "User updated successfully", user: updatedUser });
  } catch (error) {
    console.error("Update error:", error); // Log the error for debugging
    res.status(400).json({ success: false, message: "Error updating user", error: error.message });
  }
};

// Delete user
export const deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }
    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete error:", error); // Log the error for debugging
    res.status(500).json({ success: false, message: "Error deleting user", error: error.message });
  }
};
// Display approval status of each product for a seller
export const getSellerProducts = async (req, res) => {
  try {
    const products = await Product.find({ sellerId: req.user._id });
    res.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching products:", error);
    res.status(500).json({ success: false, message: "Error fetching products", error: error.message });
  }
};

// Mark product as sold and delete it from the database
export const markProductAsSold = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if the logged-in user is the seller of the product
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to mark this product as sold" });
    }

    // Delete product as it's marked as sold
    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Product marked as sold and deleted successfully" });
  } catch (error) {
    console.error("Error marking product as sold:", error);
    res.status(500).json({ success: false, message: "Error marking product as sold", error: error.message });
  }
};

// Delete product if it has pending approval status
export const deletePendingProduct = async (req, res) => {
  const { id } = req.params;

  try {
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    // Check if the logged-in user is the seller of the product and the product status is pending
    if (product.sellerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Unauthorized to delete this product" });
    }
    if (product.approvalStatus !== "pending") {
      return res.status(400).json({ success: false, message: "Cannot delete a product that is not pending approval" });
    }

    // Proceed to delete the pending product
    await Product.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Pending product deleted successfully" });
  } catch (error) {
    console.error("Error deleting pending product:", error);
    res.status(500).json({ success: false, message: "Error deleting pending product", error: error.message });
  }
};