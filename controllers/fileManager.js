const client = require('../models/db_init');


async function checkFolder(username, foldername) {
    try {
        const checkFolderQuery = 'SELECT id FROM folders WHERE name = $1 AND created_by = $2';
        const result = await client.query(checkFolderQuery, [foldername, username]);
        console.log('Query:', checkFolderQuery);
        console.log('Parameters:', [foldername, username]);
        
        if (result.rowCount == 0) {
            return false;
        }
        return true;
    } catch (error) {
        console.error('Error while checking folder:', error);
        return false; 
    }
}

async function uploadFolder(username, foldername, etag, parent_folder=null) {
    try{
        let parent_folder_id = null;
        if(parent_folder){ 
            const extract_parent_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_parent_id, [parent_folder]);
            parent_folder_id = output.rows[0].id;
        }
        const insertQuery = `INSERT INTO folders 
                             (name, created_by, parent_folder, s3_object_key)
                             VALUES ($1, $2, $3, $4)`
        const values = [foldername, username, parent_folder_id, etag];
        const result = await client.query(insertQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    }catch(error){
        console.error('Error while adding to folders table:', error);
    }
}


async function checkSubFolder(username, sub_folder_name, parent_folder_name){
    try{ 
        
        const extract_parent_id = `SELECT id FROM folders WHERE name=$1`; 
        const output = await client.query(extract_parent_id, [parent_folder_name]);
        const parent_folder_id = output.rows[0].id;
        
        const checkFolderQuery = `SELECT id FROM folders WHERE name = $1 
                                   AND created_by = $2 AND parent_folder = $3`;
        const result = await client.query(checkFolderQuery, [sub_folder_name, username, parent_folder_id]);
        if(result.rowCount == 0)
            return false; 
        return true;
    } catch (error){
        console.log("Error while checking subfolder", error);
    }
}


async function checkFile(filename, username, sub_folder_name=null){
    try { 
        
        let sub_folder_id = null;
        if(sub_folder_name){
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`; 
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        
        const checkFileQuery = `SELECT id FROM files WHERE name = $1 
                                   AND uploaded_by = $2 AND parent_folder = $3`;
        const result = await client.query(checkFileQuery, [filename, username, sub_folder_id]);
        
        if(result.rowCount == 0)
            return false; 
        return true;
    } catch (error) {
        console.log("Error while checking file", error);
    }
}

async function uploadFile(filename, username, size, etag, sub_folder_name=null){
    try {
        let sub_folder_id = null;
        if(sub_folder_name){ 
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        const insertQuery = `INSERT INTO files 
                             (name, size, uploaded_by, parent_folder, s3_object_key)
                             VALUES ($1, $2, $3, $4, $5)`
        const values = [filename, size, username, sub_folder_id, etag];
        const result = await client.query(insertQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while adding to files table:', error);
    }
}

async function deleteFile(filename, username, sub_folder_name=null){
    try {
        let sub_folder_id = null;
        if(sub_folder_name){ 
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        const deleteQuery = `DELETE FROM files WHERE name=$1 AND uploaded_by=$2 AND parent_folder=$3`
        const values = [filename, username, sub_folder_id];
        const result = await client.query(deleteQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while deleting from files table:', error);
    }
}

async function renameFile(old_filename, new_filename, username, sub_folder_name){
    try {
        let sub_folder_id = null;
        if(sub_folder_name){ 
            const extract_sub_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_sub_id, [sub_folder_name]);
            sub_folder_id = output.rows[0].id;
        }
        const renameQuery = `UPDATE files SET name=$1 WHERE name=$2 AND uploaded_by=$3 AND parent_folder=$4`
        const values = [new_filename, old_filename, username, sub_folder_id];
        const result = await client.query(renameQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while renaming from files table:', error);
    }
}

async function moveFile(filename, username, old_folder=null, new_folder=null){
    try {
        let old_folder_id = null;
        if(old_folder){ 
            const extract_old_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_old_id, [old_folder]);
            old_folder_id = output.rows[0].id;
        }
        let new_folder_id = null;
        if(new_folder){ 
            const extract_new_id = `SELECT id FROM folders WHERE name=$1`;
            const output = await client.query(extract_new_id, [new_folder]);
            new_folder_id = output.rows[0].id;
        }
        const moveQuery = `UPDATE files SET parent_folder=$1 WHERE name=$2 AND uploaded_by=$3 AND parent_folder=$4`
        const values = [new_folder_id, filename, username, username, old_folder_id];
        const result = await client.query(moveQuery, values);
        if(result.rowCount === 1)
            return true; 
        return false;
    } catch (error) {
        console.error('Error while moving within files table:', error);
    }
}

async function showFolders() {
    try {
        const query = 'SELECT * FROM folders';
        const output = client.query(query);
        return output;
    } catch (error) {
        console.error('Some error occured: ', error.message);
        return { success: false, message: "Can't fetch from folders db" }
    }
}

async function showFiles() {
    try {
        const query = 'SELECT * FROM files';
        const output = client.query(query);
        return output;
    } catch (error) {
        console.error('Some error occured: ', error.message);
        return { success: false, message: "Can't fetch from files db" }
    }
}

module.exports = {
    checkFolder, uploadFolder, showFolders, showFiles, checkSubFolder,
    uploadFile, checkFile, deleteFile, renameFile, moveFile
};