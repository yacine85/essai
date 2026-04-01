import bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const run = async () => {
  // Create connection
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'qrqc_prod'
  });

  // Hash passwords
  const adminHash = await bcrypt.hash('admin123', 10);
  const chefHash = await bcrypt.hash('chef123', 10);
  const managerHash = await bcrypt.hash('manager123', 10);

  console.log('Admin hash:', adminHash);
  console.log('Chef hash:', chefHash);
  console.log('Manager hash:', managerHash);

  // Update users in database
  await connection.execute(
    'UPDATE users SET password = ? WHERE email = ?',
    [adminHash, 'admin@qrqc.fr']
  );
  
  await connection.execute(
    'UPDATE users SET password = ? WHERE email = ?',
    [chefHash, 'chef@qrqc.fr']
  );
  
  await connection.execute(
    'UPDATE users SET password = ? WHERE email = ?',
    [managerHash, 'manager@qrqc.fr']
  );

  console.log('✅ Passwords updated successfully!');
  
  await connection.end();
};

run().catch(console.error);

