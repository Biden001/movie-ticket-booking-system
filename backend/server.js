const { connectDB } = require('./db');

async function main() {
    try {
        const db = await connectDB();
        if (db) {
            try {
                // Sử dụng pool để tạo request
                const result = await db.request().query`SELECT * FROM movies_info`;
                console.log(result.recordset);
            } catch (err) {
                console.error('Query failed: ', err);
            } finally {
                // Đóng connection pool khi hoàn thành
                await db.close();
            }
        }
    } catch (err) {
        console.error('Failed to connect to database: ', err);
    }
}

main();