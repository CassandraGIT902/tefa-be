const { prisma } = require("../../utils/Prisma");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const secret = process.env.JWT_SECRET; 
const expireIn = 60 * 60 * 1; // Access token expires in 1 hour
const refreshExpireIn = 60 * 60 * 24; // Refresh token expires in 24 hours

// Function to generate access token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: expireIn }
  );
};

// Function to generate refresh token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    secret,
    { expiresIn: refreshExpireIn }
  );
};

// Register new user
const register = async (req, res) => {
  try {
    const { email, name, password } = req.body;

    const emailAlreadyExist = await prisma.user.findFirst({ where: { email } });
    if (emailAlreadyExist) {
      return res.status(400).json({ message: 'Email already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await prisma.user.create({
      data: { email, password: hashedPassword, name, role: "USER" },
    });

    return res.status(201).json({
      message: "User registered successfully",
    });
  } catch (err) {
    console.error("Error during registration:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Login user
const login = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await prisma.user.findFirst({ where: { email } });
    if (!user) return res.status(404).json({ message: "Email not found!" });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ message: "Incorrect password" });

    // Generate tokens
    const accessToken = generateAccessToken(user);
    const refreshToken = generateRefreshToken(user);

    // Store refresh token in the database
    await prisma.user.update({
      where: { id: user.id },
      data: { refreshToken }
    });

    res.cookie('token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production', 
      sameSite: 'strict',
      maxAge: expireIn * 1000,
    });

    res.status(200).json({
      data: { UserId: user.id, name: user.name },
      token: accessToken,
      refreshToken,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
};

// Refresh token endpoint
const refreshToken = async (req, res) => {
  const { refreshToken: requestToken } = req.body;

  if (!requestToken) {
    return res.status(403).json({ message: "Refresh Token is required!" });
  }

  try {
    const user = await prisma.user.findFirst({ where: { refreshToken: requestToken } });
    if (!user) return res.status(403).json({ message: "Refresh token is not valid" });

    const decoded = jwt.verify(requestToken, secret);  // Verify the refresh token
    const newAccessToken = generateAccessToken(user);

    return res.status(200).json({
      accessToken: newAccessToken,
    });
  } catch (err) {
    console.error("Error during token refresh:", err);
    return res.status(500).json({ message: "Failed to refresh token" });
  }
};

// Logout (clear cookies)
const logout = (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

module.exports = { register, login, logout, refreshToken };
