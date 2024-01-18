const express = require('express');
const router = express.Router();
const { s3Controller, upload } = require('../controllers/s3controller');
const verifyUser = require('../middleware/middleware');

router.use(verifyUser);

// Route to upload a folder
router.post('/uploadFolder', s3Controller.uploadFolder);

// Route to upload a subfolder
router.post('/subFolderUpload', s3Controller.subFolderUpload);

// Route to upload a file
router.post('/fileUpload', upload.single('uploadhere'), s3Controller.fileUpload);

// Route to delete a file
router.delete('/deleteFile', s3Controller.deleteFile);

// Route to rename a file
router.put('/renameFile', s3Controller.renameFile);

// Route to move a file
router.put('/moveFile', s3Controller.moveFile);


module.exports = router;
