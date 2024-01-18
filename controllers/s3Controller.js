const fs = require('fs');
const path = require('path');
const file_manager = require('./fileManager');
const multer = require('multer');
const {
    S3Client,
    PutObjectCommand
} = require('@aws-sdk/client-s3');
const {
    DeleteObjectCommand
} = require('@aws-sdk/client-s3');
const {
    CopyObjectCommand
} = require('@aws-sdk/client-s3');
const {
    fromIni
} = require('@aws-sdk/credential-provider-ini');

const bucket = 'winkingroad';
const region = 'us-east-1';

const s3 = new S3Client({
    region: region,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
console.log('Current working directory:', process.cwd());

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, path.resolve('uploads'));
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname);
    },
});

const upload = multer({
    storage
});


const s3Controller = {
    uploadFolder: async (req, res) => {
        try {
            const {
                foldername
            } = req.body;
            const username = req.session.username;

            
            const folderExists = await file_manager.checkFolder(username, foldername);
            if (folderExists) {
                console.log('Folder exists?', folderExists, 'Username:', username, 'Foldername:', foldername);
                return res.status(400).json({
                    error: `Folder (${foldername}) already exists`
                });
            }

            
            const folderpath = `${username}/${foldername}/`;
            const bodyContent = `${Date.now()}-${foldername}`;

            const params = {
                Bucket: bucket,
                Key: folderpath,
                Body: bodyContent,
            };

            await s3.send(new PutObjectCommand(params));

            console.log('Folder created successfully:', foldername);

            
            const etag = 'etag'; 
            await file_manager.uploadFolder(username, foldername, etag);

            
            res.status(201).json({
                success: true,
                message: `${foldername} created successfully`
            });
        } catch (error) {
            console.error('Error uploading the folder:', error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    },

    subFolderUpload: async (req, res) => {
        try {
            const {
                parent_folder_name,
                sub_folder_name
            } = req.body;
            const username = req.session.username;

            
            const parentFolderExists = await file_manager.checkFolder(username, parent_folder_name);
            if (!parentFolderExists) {
                return res.status(400).json({
                    error: `You need to create a parent folder (${parent_folder_name}) first`
                });
            }

            
            const subFolderNotExists = await file_manager.checkSubFolder(username, sub_folder_name, parent_folder_name);
            if (subFolderNotExists) {
                return res.status(400).json({
                    error: `${sub_folder_name} already exists in ${parent_folder_name}`
                });
            }

            
            const folderpath = `${username}/${parent_folder_name}/${sub_folder_name}/`;
            const params = {
                Bucket: bucket,
                Key: folderpath,
                Body: `${Date.now()}-${sub_folder_name}`
            };
            const data = await s3.send(new PutObjectCommand(params)); 
            console.log('Folder created successfully:', sub_folder_name);

            
            const etag = data.ETag;
            await file_manager.uploadFolder(username, sub_folder_name, etag, parent_folder_name);

            
            res.status(201).json({
                success: true,
                message: `${parent_folder_name}/${sub_folder_name} created successfully`
            });
        } catch (error) {
            console.error('Error uploading the subfolder:', error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    },


    fileUpload: async (req, res) => {
        try {
            const {
                parent_folder_name,
                sub_folder_name,
                file_name
            } = req.body;
            const username = req.session.username;
            let folder_path = username + '/';

            console.log('Request Body:', req.body);

            if (parent_folder_name) {
                console.log('Parent folder provided:', parent_folder_name);
                const not_exists = await file_manager.checkFolder(username, parent_folder_name);

                if (!not_exists) {
                    return res.status(400).json({
                        error: `Parent folder (${parent_folder_name}/) does not exist`
                    });
                } else {
                    folder_path += parent_folder_name + '/';

                    if (sub_folder_name) {
                        console.log('Subfolder provided:', sub_folder_name);
                        const sub_not_exists = await file_manager.checkSubFolder(username, sub_folder_name, parent_folder_name);

                        if (!sub_not_exists) {
                            return res.status(400).json({
                                error: `${sub_folder_name}/ does not exist in ${parent_folder_name}/`
                            });
                        } else {
                            folder_path += sub_folder_name + '/';
                        }
                    }
                }
            } else if (sub_folder_name) {
                console.log('Subfolder provided, but no parent folder name');
                return res.status(400).json({
                    error: 'You have given a subfolder name, but no parent folder name !/'
                });
            }

            const final_file_name = !file_name ? req.file.originalname : file_name;

            const file_not_exists = await file_manager.checkFile(final_file_name, username, sub_folder_name);
            if (file_not_exists) {
                const errorMessage = sub_folder_name ?
                    `${final_file_name} already exists in ${sub_folder_name}` :
                    `${final_file_name} already exists at root level`;

                return res.status(400).json({
                    error: errorMessage
                });
            }

            console.log('Final file name:', final_file_name);
            console.log('Subfolder name:', sub_folder_name);

            folder_path += final_file_name;
            const upload_stored_path = path.resolve('uploads', req.file.originalname);
            const filecontent = fs.createReadStream(upload_stored_path);

            console.log('Constructed folder path:', folder_path);

            const params = {
                Bucket: bucket,
                Key: folder_path,
                Body: filecontent
            };
            const data = await s3.send(new PutObjectCommand(params));
            console.log('File uploaded successfully to...', folder_path);

            const etag = data.ETag;
            const file_stats = fs.statSync(upload_stored_path);
            const size = file_stats.size;

            await file_manager.uploadFile(final_file_name, username, size, etag, sub_folder_name);

            res.status(201).json({
                success: true,
                message: `File ${final_file_name} successfully uploaded`
            });
        } catch (error) {
            console.error('Error while uploading file: ', error);
            res.status(500).json({
                error: 'Internal server error'
            });
        } finally {
            const stored_path = path.resolve('uploads', req.file.originalname);
            fs.unlink(stored_path, (err) => {
                if (err) console.error('Error while deleting the file:', err);
                else console.log('File has been successfully removed from disk storage.');
            });
        }
    },




    deleteFile: async (req, res) => {
        try {
            const {
                filename,
                parent_folder_name
            } = req.body;
            const username = req.session.username;
            const split_folders = parent_folder_name.split('/');
            const immediate_folder_name = split_folders[split_folders.length - 1];

            const not_exists = await file_manager.checkFolder(username, immediate_folder_name);
            if (!not_exists) {
                return res.status(400).json({
                    error: `You need to create a parent folder (${immediate_folder_name}) first`
                });
            }

            const file_not_exists = await file_manager.checkFile(filename, username, immediate_folder_name);
            if (!file_not_exists) {
                return res.status(400).json({
                    error: `${filename} does not exist in folder(${immediate_folder_name})`
                });
            }

            const filepath = username + "/" + parent_folder_name + "/" + filename;

            const data = await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: filepath
            })); 
            console.log("Deleted successfully");

            const result = await file_manager.deleteFile(filename, username, immediate_folder_name);

            res.status(200).json({
                success: true,
                message: `${filename} successfully deleted`
            });
        } catch (error) {
            console.error("Error while deleting file", error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    },


    renameFile: async (req, res) => {
        try {
            const {
                old_filename,
                parent_folder_path,
                new_filename
            } = req.body;
            const username = req.session.username;
            const split_folders = parent_folder_path.split('/');
            const immediate_folder = split_folders[split_folders.length - 1];

            const not_exists = await file_manager.checkFolder(username, immediate_folder);
            if (!not_exists) {
                return res.status(400).json({
                    error: `There is no folder (${immediate_folder})`
                });
            }

            const file_not_exists = await file_manager.checkFile(old_filename, username, immediate_folder);
            if (file_not_exists) {
                return res.status(400).json({
                    error: `${old_filename} does not exist in folder(${immediate_folder})`
                });
            }

            const file_not_exists_new = await file_manager.checkFile(new_filename, username, immediate_folder);
            if (file_not_exists_new) {
                return res.status(400).json({
                    error: `${new_filename} already exists in folder(${immediate_folder})`
                });
            }

            const filepath_old = username + "/" + parent_folder_path + "/" + old_filename;
            const filepath_new = username + "/" + parent_folder_path + "/" + new_filename;

            const data_new = await s3.send(new CopyObjectCommand({
                Bucket: bucket,
                CopySource: `/${bucket}/${filepath_old}`,
                Key: filepath_new
            }));

            const data_deleted = await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: filepath_old
            }));

            const result = await file_manager.renameFile(old_filename, new_filename, username, immediate_folder);

            res.status(200).json({
                success: true,
                message: `${old_filename} now renamed to ${new_filename}`
            });
        } catch (error) {
            console.error("Error while renaming file", error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    },


    moveFile: async (req, res) => {
        try {
            const {
                filename,
                old_folder_path,
                new_folder_path
            } = req.body;
            const username = req.session.username;
            const split_folders_old = old_folder_path.split('/');
            const immediate_folder_old = split_folders_old[split_folders_old.length - 1];
            const split_folders_new = new_folder_path.split('/');
            const immediate_folder_new = split_folders_new[split_folders_new.length - 1];

            const not_exists_old = await file_manager.checkFolder(username, immediate_folder_old);
            if (!not_exists_old) {
                return res.status(400).json({
                    error: `There is no source folder (${immediate_folder_old})`
                });
            }

            const file_not_exists_old = await file_manager.checkFile(filename, username, immediate_folder_old);
            if (!file_not_exists_old) {
                return res.status(400).json({
                    error: `${filename} does not exist in folder(${immediate_folder_old})`
                });
            }

            const not_exists_new = await file_manager.checkFolder(username, immediate_folder_new);
            if (!not_exists_new) {
                return res.status(400).json({
                    error: `There is no target folder (${immediate_folder_new})`
                });
            }

            const file_not_exists_new = await file_manager.checkFile(filename, username, immediate_folder_new);
            if (file_not_exists_new) {
                return res.status(400).json({
                    error: `${filename} already exists in folder(${immediate_folder_new})`
                });
            }

            const filepath_old = username + "/" + old_folder_path + "/" + filename;
            const filepath_old_for_copy = "/" + bucket + "/" + filepath_old;
            const filepath_new = username + "/" + new_folder_path + "/" + filename;

            const data_new = await s3.send(new CopyObjectCommand({
                Bucket: bucket,
                CopySource: `/${bucket}/${filepath_old}`,
                Key: filepath_new
            }));

            const data_deleted = await s3.send(new DeleteObjectCommand({
                Bucket: bucket,
                Key: filepath_old
            }));

            const result = await file_manager.moveFile(filename, username, immediate_folder_old, immediate_folder_new);

            res.status(200).json({
                success: true,
                message: `${filename} moved from ${old_folder_path} to ${new_folder_path}`
            });
        } catch (error) {
            console.error("Error while moving file", error);
            res.status(500).json({
                error: 'Internal server error'
            });
        }
    }



};

module.exports = {
    s3Controller,
    upload
};