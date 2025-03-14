import express from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import sharp from "sharp";

const router = express.Router();

// Skapa lagringsinställning för multer
const createStorage = (uploadDir) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      const fullUploadDir = path.resolve("public", uploadDir);

      // Skapa mappen om den inte finns
      if (!fs.existsSync(fullUploadDir)) {
        fs.mkdirSync(fullUploadDir, { recursive: true });
      }

      cb(null, fullUploadDir);
    },
    filename: (req, file, cb) => {
      // Skapa unikt filnamn
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      cb(
        null,
        file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname)
      );
    },
  });

// Bild-filuppladdning
const imageStorage = createStorage("uploads/images");
const imageUpload = multer({
  storage: imageStorage,
  fileFilter: (req, file, cb) => {
    const allowedFormats = ["image/jpeg", "image/png", "image/webp"];
    if (allowedFormats.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Endast JPEG, PNG och WEBP är tillåtna"), false);
    }
  },
  limits: { fileSize: 1000 * 1024 * 1024 }, // 1000 MB max storlek
});

// Image-uppladdningsroute
// Bilduppladdningsroute
router.post("/image", imageUpload.single("imageFile"), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: "Ingen fil har laddats upp" });
  }

  // Sätt filens path
  const uploadedImagePath = path.resolve(
    "public",
    "uploads",
    "images",
    req.file.filename
  );

  // Sätt output path för den konverterade bilden
  const outputImagePath = path.resolve(
    "public",
    "uploads",
    "images",
    "converted-" + req.file.filename
  );

  try {
    // Komprimera och konvertera bilden till 8MB med sharp
    await sharp(uploadedImagePath)
      // .resize({ width: 1920 }) // Exempel på begränsning av storlek
      .jpeg({ quality: 85 }) // Justera kvalitet för att minska storlek
      .toFile(outputImagePath);

    // Skicka respons
    res.json({
      message: "Bild konverterad och uppladdad",
      filename: "converted-" + req.file.filename,
      path: `/public/uploads/images/converted-${req.file.filename}`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Fel vid konvertering av bild",
      error: error.message,
    });
  }
});

export default router;
