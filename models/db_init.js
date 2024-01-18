const pkg = require("pg");
const { Client } = pkg;

const client = new Client({
    host: "localhost",
    user: "postgres",
    password: "Yv1107@2001",
    database: "file_manager_db",
    port: 5432
});

module.exports = client;

async function initialize_tables() {
    try {
        await client.connect();

        const check_connection = `SELECT count(*) AS table_count
                                  FROM information_schema.tables
                                  WHERE table_schema = 'public';`;

        const result = await client.query(check_connection);
        const tableCount = parseInt(result.rows[0].table_count);

        process.stdout.write("Checking if tables are initialized...");
        if (tableCount === 3) {
            console.log("Yes, they are.");
        } else {
            console.log("Tables are not initialized yet, initializing...");

            const creating_user_table = `CREATE TABLE IF NOT EXISTS "users" (
                                            id SERIAL UNIQUE NOT NULL,
                                            username VARCHAR(50) PRIMARY KEY UNIQUE NOT NULL,
                                            email VARCHAR(100) UNIQUE NOT NULL,
                                            password_hash TEXT NOT NULL
                                            role VARCHAR(20) DEFAULT 'user' NOT NULL
                                        );`;

                                        const creating_folders_table = `CREATE TABLE IF NOT EXISTS "folders" (
                                            id SERIAL PRIMARY KEY,
                                            name VARCHAR(100) NOT NULL,
                                            created_by VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
                                            parent_folder INTEGER REFERENCES folders(id) ON DELETE CASCADE,
                                            s3_object_key TEXT NOT NULL,
                                            created_at TIMESTAMPTZ DEFAULT NOW()
                                        );`;
                                        
                                        const creating_files_table = `CREATE TABLE IF NOT EXISTS "files" (
                                            id SERIAL PRIMARY KEY,
                                            name VARCHAR(100) NOT NULL,
                                            size BIGINT NOT NULL,
                                            uploaded_by VARCHAR(50) REFERENCES users(username) ON DELETE CASCADE,
                                            parent_folder INTEGER REFERENCES folders(id) ON DELETE CASCADE,
                                            s3_object_key TEXT NOT NULL,
                                            created_at TIMESTAMPTZ DEFAULT NOW()
                                        );`;

            try {
                await client.query(creating_user_table);
                await client.query(creating_folders_table);
                await client.query(creating_files_table);
            } catch (error) {
                console.log("Error creating tables: ", error.message);
            }
        }
    } catch (error) {
        console.log("Error connecting to the database: ", error.message);
    } finally {
        // Do not close the client connection here; keep it open for the application's lifetime.
    }
}

initialize_tables();
