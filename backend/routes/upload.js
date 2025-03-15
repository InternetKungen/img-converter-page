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
router.post("/image", imageUpload.array("imageFiles", 10), async (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ message: "Inga filer har laddats upp" });
  }

  const targetFormat = req.body.format || "jpeg";

  const results = [];

  // Processa varje fil
  for (const file of req.files) {
    // Sätt filens path
    const uploadedImagePath = path.resolve(
      "public",
      "uploads",
      "images",
      file.filename
    );

    // Create new filename with the correct extension
    const originalNameWithoutExt = path.parse(file.originalname).name;
    const fileNameWithoutExt = `${originalNameWithoutExt}-${Date.now()}`;
    // const fileNameWithoutExt = file.filename.substring(
    //   0,
    //   file.filename.lastIndexOf(".")
    // );
    // const newFileName = `converted-${fileNameWithoutExt}.${targetFormat}`;
    const newFileName = `converted-${fileNameWithoutExt}.${targetFormat}`;

    // Sätt output path för den konverterade bilden
    const outputImagePath = path.resolve(
      "public",
      "uploads",
      "images",
      newFileName
    );

    try {
      // Compress and convert the image with sharp based on targetFormat
      let sharpImage = sharp(uploadedImagePath);

      if (targetFormat === "jpeg" || targetFormat === "jpg") {
        sharpImage = sharpImage.jpeg({ quality: 85 });
      } else if (targetFormat === "png") {
        sharpImage = sharpImage.png({ compressionLevel: 6 });
      } else if (targetFormat === "webp") {
        sharpImage = sharpImage.webp({ quality: 85 });
      } else if (targetFormat === "avif") {
        sharpImage = sharpImage.avif({ quality: 80 });
      } else if (targetFormat === "tiff") {
        sharpImage = sharpImage.tiff({ quality: 80 });
      }

      await sharpImage.toFile(outputImagePath);

      results.push({
        originalName: file.originalname,
        filename: newFileName,
        path: `/public/uploads/images/${newFileName}`,
      });
    } catch (error) {
      results.push({
        originalName: file.originalname,
        error: error.message,
      });
    }
  }

  // Skicka respons med resultaten för alla filer
  res.json({
    message: `${results.length} bild(er) konverterade och uppladdade`,
    results: results,
  });
});

export default router;
