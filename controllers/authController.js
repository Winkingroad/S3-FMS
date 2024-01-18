const db = require('../models/db');


async function registerUser(req, res) {
    const {username, email, password, role} = req.body;
    const result = await db.registerUser(username, email, password, role);
    if (result.success) {
        res.status(201).json({message: "User created successfully"});
    } else {
        res.status(400).json({message: result.message});
    }
}

async function loginUser(req, res) {
    const {username, password} = req.body;
    const result = await db.loginUser(username, password);
    if (result.success) {
        const token = db.generateToken(result.user);
        res.status(200).json({message: "User logged in successfully",token});
    } else {
        res.status(400).json({message: result.message});
    }
}

async function showUsers(req, res) {
    const result = await db.showUsers();
    if (result.success) {
      res.status(200).json({ users: result.users });
    } else {
      res.status(400).json({ message: result.message });
    }
}

async function deleteUserByName(req, res) {
    const username = req.params.username;
    const result = await db.deleteUserByName(username);
    if (result.success) {
        res.status(200).json({message: "User deleted successfully"});
    } else {
        res.status(400).json({message: result.message});
    }
}

async function updateUserPassword(req, res) {
    const username = req.params.username;
    const newPassword = req.body.password;
    const result = await db.updateUserPassword(username, newPassword);
    if (result.success) {
        res.status(200).json({message: "User password updated successfully"});
    } else {
        res.status(400).json({message: result.message});
    }
}

module.exports = {
    registerUser,
    loginUser,
    showUsers,
    deleteUserByName,
    updateUserPassword
}