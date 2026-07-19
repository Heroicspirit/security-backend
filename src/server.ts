import cors from "cors";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { PORT } from "./config";
import { connectDatabase } from "./database/mongodb";
import authRoutes from "./routes/auth.route";
import productRoutes from "./routes/product.route";
import orderRoutes from "./routes/order.route";
import adminRoutes from "./routes/admin.route";
import path from "path";
import { generalRateLimit } from "./middleware/rateLimit.middleware";

const app = express();

// Serve static files from uploads directory BEFORE all middleware
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false, // Disable CSP to allow loading images from backend
  crossOriginEmbedderPolicy: false,
}));

app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3001',
  credentials: true,
}));

// Apply global rate limiting
app.use(generalRateLimit);

app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get("/", (_req, res) => {
  res.json({ message: "Security Backend API is running" });
});

app.get("/health", (_req, res) => {
  res.json({ status: "OK", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/orders", orderRoutes);
app.use("/api/admin", adminRoutes);

connectDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
    });
  })
  .catch((error) => {
    console.error("Failed to start server:", error);
    process.exit(1);
  });
