const fileupload = require("express-fileupload");
const path = require("path");
const fs = require("fs");

exports.localFileUpload = async (files, allowedTypes = []) => {
  try {
    // Ensure `files` is always an array
    const filesArray = Array.isArray(files) ? files : [files];

    // Define the relative upload directory (e.g., "/uploads")
    const uploadDir = path.join(__dirname, "../uploads"); // Move outside 'utils'

    // Create the upload directory if it doesn't exist
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    // Upload all files
    const uploadResults = await Promise.all(
      filesArray.map((file) => {
        // Validate file type
        const fileType = file.mimetype; // e.g., "image/png", "application/pdf", "video/mp4"
        if (allowedTypes.length > 0 && !allowedTypes.includes(fileType)) {
          throw new Error(`File type ${fileType} not allowed`);
        }

        // const filename = `${Date.now()}_${file.name}`;

        const ext = path.extname(file.name); // Get file extension
        const baseName = path.basename(file.name, ext); // Get file name without extension
        const filename = `${baseName}_${Date.now()}${ext}`; // fileName_timestamp.ext
        const uploadPath = path.join(uploadDir, filename); // Full path for saving
        const relativePath = `/uploads/${filename}`; // Store relative path

        return new Promise((resolve, reject) => {
          file.mv(uploadPath, (err) => {
            if (err) reject(err);
            else resolve({ path: relativePath }); // Return relative path
          });
        });
      })
    );

    return uploadResults;
  } catch (error) {
    console.error("File upload failed:", error.message);
    throw new Error(error.message);
  }
};
