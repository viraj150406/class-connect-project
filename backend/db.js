const mysql = require("mysql2/promise");

const db = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "LocalDevOnly123",
    database: "classconnect",
    port: 3306,
    waitForConnections: true,
    connectionLimit: 10
});

async function testConnection() {
    try {
        const connection = await db.getConnection();
        console.log("MySQL Database Connected Successfully!");
        connection.release();
    } catch (error) {
        console.error("MySQL Connection Failed:", error.message);
    }
}

testConnection();

module.exports = db;
