import express from 'express';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { format } from 'date-fns';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

app.use(express.json());

// Initialize Database
const db = createClient({
  url: 'libsql://swiftrollcall-anumodk.aws-ap-northeast-1.turso.io',
  authToken: 'eyJhbGciOiJFZERTQSIsInR5cCI6IkpXVCJ9.eyJhIjoicnciLCJpYXQiOjE3NzM0NzQ0NjgsImlkIjoiMDE5Y2ViNTAtYTcwMS03ZWYwLTg5ZWUtZjMzMmNjODBmMTE3IiwicmlkIjoiN2NkMjVlMzQtNTE1My00ZDk3LWFmYzgtNzU5NjVmNjk1YjFhIn0.pCSecADtc9o6FDv33Auk_GLgVw3rIF5t7TtEpLsFQiE0Y4Yws6iRhbiQEkap19PnWXrPd2NvTggEZkPUFrg-Aw'
});

// Auth Middleware
const authenticateToken = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

async function sendNotification(contactInfo: string, subject: string, body: string) {
  try {
    const result = await db.execute('SELECT key, value FROM settings WHERE key IN ("whatsappPhoneNumberId", "whatsappAccessToken", "whatsappProvider", "rocketSenderApiKey", "rocketSenderDeviceId")');
    const config: Record<string, string> = {};
    result.rows.forEach(row => {
      config[row.key as string] = row.value as string;
    });

    const provider = config.whatsappProvider || 'meta';
    const cleanNumber = contactInfo.replace(/\D/g, '');

    if (provider === 'rocketsender') {
      const apiKey = config.rocketSenderApiKey;
      const deviceId = config.rocketSenderDeviceId;

      if (!apiKey || !deviceId) {
        console.log(`[SIMULATED ROCKETSENDER] To: ${contactInfo} | Message: ${body}`);
        return;
      }

      const response = await fetch('https://api.rocketsender.co/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: cleanNumber,
          body: body,
          deviceId: deviceId
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('RocketSender API Error:', data);
      } else {
        console.log(`Successfully sent RocketSender WhatsApp to ${cleanNumber}`);
      }
    } else {
      // Meta (Default)
      const phoneNumberId = config.whatsappPhoneNumberId;
      const accessToken = config.whatsappAccessToken;

      if (!phoneNumberId || !accessToken) {
        console.log(`[SIMULATED META WHATSAPP] To: ${contactInfo} | Message: ${body}`);
        console.log('Configure WhatsApp API in Settings to send real messages.');
        return;
      }

      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: cleanNumber,
          type: 'text',
          text: { body }
        })
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Meta WhatsApp API Error:', data);
      } else {
        console.log(`Successfully sent Meta WhatsApp to ${cleanNumber}`);
      }
    }
  } catch (error) {
    console.error('Failed to send WhatsApp:', error);
  }
}

// Setup tables
async function setupDatabase() {
  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      name TEXT NOT NULL,
      darkMode INTEGER DEFAULT 0,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations
  try {
    await db.execute("ALTER TABLE users ADD COLUMN darkMode INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE users ADD COLUMN username TEXT UNIQUE");
  } catch (e) {}

  await db.executeMultiple(`
    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      description TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      parentName TEXT,
      contactInfo TEXT NOT NULL,
      subjects TEXT NOT NULL,
      classId INTEGER,
      rateType TEXT NOT NULL CHECK(rateType IN ('hourly', 'monthly')),
      rateAmount REAL NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(classId) REFERENCES classes(id)
    );

    CREATE TABLE IF NOT EXISTS attendance (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      date TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('Present', 'Absent', 'Cancelled')),
      notes TEXT,
      FOREIGN KEY(studentId) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS payments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      studentId INTEGER NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      receiptNumber TEXT NOT NULL UNIQUE,
      notes TEXT,
      FOREIGN KEY(studentId) REFERENCES students(id)
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS receipt_templates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      config TEXT NOT NULL,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    
    INSERT OR IGNORE INTO settings (key, value) VALUES ('receiptTemplate', 'modern');
    INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsappProvider', 'meta');

    -- Indices for performance
    CREATE INDEX IF NOT EXISTS idx_students_classId ON students(classId);
    CREATE INDEX IF NOT EXISTS idx_attendance_studentId ON attendance(studentId);
    CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
    CREATE INDEX IF NOT EXISTS idx_payments_studentId ON payments(studentId);
    CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(date);
  `);

  // Migration: Add classId to students if it doesn't exist
  try {
    await db.execute('ALTER TABLE students ADD COLUMN classId INTEGER REFERENCES classes(id)');
  } catch (e) {
    // Column might already exist, ignore error
  }
}

// --- API Routes ---

// Auth
app.post('/api/auth/signup', async (req, res) => {
  const { name, username, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: 'INSERT INTO users (name, username, email, password) VALUES (?, ?, ?, ?)',
      args: [name, username, email || null, hashedPassword]
    });
    
    const token = jwt.sign({ id: Number(result.lastInsertRowid), username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: Number(result.lastInsertRowid), name, username, email, darkMode: false } });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      if (error.message.includes('username')) return res.status(400).json({ error: 'Username already exists' });
      if (error.message.includes('email')) return res.status(400).json({ error: 'Email already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM users WHERE username = ?',
      args: [username]
    });
    
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const validPassword = await bcrypt.compare(password, user.password as string);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign({ id: user.id, username: user.username }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user.id, name: user.name, username: user.username, email: user.email, darkMode: Boolean(user.darkMode) } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

app.get('/api/auth/me', authenticateToken, async (req: any, res: any) => {
  try {
    const result = await db.execute({
      sql: 'SELECT id, name, username, email, darkMode FROM users WHERE id = ?',
      args: [req.user.id]
    });
    
    const user = result.rows[0];
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({ 
      user: { 
        ...user, 
        darkMode: Boolean(user.darkMode) 
      } 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

app.put('/api/auth/profile', authenticateToken, async (req: any, res: any) => {
  const { name, email, darkMode } = req.body;
  try {
    const updates: string[] = [];
    const args: any[] = [];

    if (name !== undefined) {
      updates.push('name = ?');
      args.push(name);
    }
    if (email !== undefined) {
      updates.push('email = ?');
      args.push(email);
    }
    if (darkMode !== undefined) {
      updates.push('darkMode = ?');
      args.push(darkMode ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    args.push(req.user.id);
    await db.execute({
      sql: `UPDATE users SET ${updates.join(', ')} WHERE id = ?`,
      args
    });

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Settings
app.get('/api/settings', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM settings');
    const config = result.rows.reduce((acc: any, row: any) => {
      if (row.key === 'customReceiptConfig') {
        try {
          acc[row.key] = JSON.parse(row.value);
        } catch {
          acc[row.key] = null;
        }
      } else {
        acc[row.key] = row.value;
      }
      return acc;
    }, {});
    res.json(config);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get settings' });
  }
});

app.put('/api/settings', async (req, res) => {
  const updates = req.body;
  try {
    const statements = Object.entries(updates).map(([key, value]) => {
      const valStr = typeof value === 'object' ? JSON.stringify(value) : String(value);
      return {
        sql: 'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value',
        args: [key, valStr]
      };
    });
    
    await db.batch(statements, 'write');
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// Receipt Templates
app.get('/api/receipt-templates', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM receipt_templates ORDER BY name');
    const templates = result.rows.map((row: any) => ({
      ...row,
      config: JSON.parse(row.config)
    }));
    res.json(templates);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get templates' });
  }
});

app.post('/api/receipt-templates', async (req, res) => {
  const { name, config } = req.body;
  try {
    const result = await db.execute({
      sql: 'INSERT INTO receipt_templates (name, config) VALUES (?, ?)',
      args: [name, JSON.stringify(config)]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create template' });
  }
});

app.put('/api/receipt-templates/:id', async (req, res) => {
  const { name, config } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE receipt_templates SET name = ?, config = ? WHERE id = ?',
      args: [name, JSON.stringify(config), req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update template' });
  }
});

app.delete('/api/receipt-templates/:id', async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM receipt_templates WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
});

// Classes
app.get('/api/classes', async (req, res) => {
  try {
    const result = await db.execute('SELECT * FROM classes ORDER BY name');
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get classes' });
  }
});

app.post('/api/classes', async (req, res) => {
  const { name, description } = req.body;
  try {
    const result = await db.execute({
      sql: 'INSERT INTO classes (name, description) VALUES (?, ?)',
      args: [name, description || null]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Class name already exists' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create class' });
  }
});

app.put('/api/classes/:id', async (req, res) => {
  const { name, description } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE classes SET name = ?, description = ? WHERE id = ?',
      args: [name, description || null, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update class' });
  }
});

app.delete('/api/classes/:id', async (req, res) => {
  try {
    // Check if students are linked to this class
    const check = await db.execute({
      sql: 'SELECT COUNT(*) as count FROM students WHERE classId = ?',
      args: [req.params.id]
    });
    if (Number(check.rows[0].count) > 0) {
      return res.status(400).json({ error: 'Cannot delete class with linked students' });
    }

    await db.execute({
      sql: 'DELETE FROM classes WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete class' });
  }
});

// Students
app.get('/api/students', async (req, res) => {
  try {
    const result = await db.execute(`
      SELECT s.*, c.name as className 
      FROM students s 
      LEFT JOIN classes c ON s.classId = c.id 
      ORDER BY s.name
    `);
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get students' });
  }
});

app.post('/api/students', async (req, res) => {
  const { name, parentName, contactInfo, subjects, classId, rateType, rateAmount } = req.body;
  try {
    const result = await db.execute({
      sql: 'INSERT INTO students (name, parentName, contactInfo, subjects, classId, rateType, rateAmount) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [name, parentName || null, contactInfo, subjects, classId || null, rateType, rateAmount]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const { name, parentName, contactInfo, subjects, classId, rateType, rateAmount } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE students SET name = ?, parentName = ?, contactInfo = ?, subjects = ?, classId = ?, rateType = ?, rateAmount = ? WHERE id = ?',
      args: [name, parentName || null, contactInfo, subjects, classId || null, rateType, rateAmount, req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to update student' });
  }
});

app.delete('/api/students/:id', async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM students WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete student' });
  }
});

// Attendance
app.get('/api/attendance', async (req, res) => {
  const { startDate, endDate, studentId } = req.query;
  let query = 'SELECT * FROM attendance WHERE 1=1';
  const args: any[] = [];
  
  if (startDate) {
    query += ' AND date >= ?';
    args.push(startDate);
  }
  if (endDate) {
    query += ' AND date <= ?';
    args.push(endDate);
  }
  if (studentId) {
    query += ' AND studentId = ?';
    args.push(studentId);
  }
  
  query += ' ORDER BY date DESC';
  
  try {
    const result = await db.execute({ sql: query, args });
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get attendance' });
  }
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, date, status, notes } = req.body;
  try {
    const result = await db.execute({
      sql: 'INSERT INTO attendance (studentId, date, status, notes) VALUES (?, ?, ?, ?)',
      args: [studentId, date, status, notes || null]
    });

    // Send automated notification if provider is configured
    const studentResult = await db.execute({
      sql: 'SELECT s.*, c.name as className FROM students s LEFT JOIN classes c ON s.classId = c.id WHERE s.id = ?',
      args: [studentId]
    });
    const student = studentResult.rows[0];

    if (student) {
      const displayDate = format(new Date(date), 'MMM d, yyyy');
      const classPart = student.className ? ` (Class: ${student.className})` : '';
      let text = '';
      if (status === 'Present') text = `Hi, attendance for ${student.name}${classPart} on ${displayDate} has been marked as Present.`;
      else if (status === 'Absent') text = `Hi, attendance for ${student.name}${classPart} on ${displayDate} has been marked as Absent.`;
      else if (status === 'Cancelled') text = `Hi, the class for ${student.name}${classPart} on ${displayDate} has been cancelled.`;

      if (text) {
        await sendNotification(student.contactInfo as string, 'Attendance Update', text);
      }
    }

    res.json({ id: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to mark attendance' });
  }
});

app.delete('/api/attendance/:id', async (req, res) => {
  try {
    await db.execute({
      sql: 'DELETE FROM attendance WHERE id = ?',
      args: [req.params.id]
    });
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete attendance' });
  }
});

// Payments
app.get('/api/payments', async (req, res) => {
  const { studentId } = req.query;
  let query = 'SELECT * FROM payments';
  const args: any[] = [];
  
  if (studentId) {
    query += ' WHERE studentId = ?';
    args.push(studentId);
  }
  
  query += ' ORDER BY date DESC';
  
  try {
    const result = await db.execute({ sql: query, args });
    res.json(result.rows);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to get payments' });
  }
});

app.post('/api/payments', async (req, res) => {
  const { studentId, amount, date, notes } = req.body;
  const receiptNumber = 'REC-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
  try {
    const result = await db.execute({
      sql: 'INSERT INTO payments (studentId, amount, date, receiptNumber, notes) VALUES (?, ?, ?, ?, ?)',
      args: [studentId, amount, date, receiptNumber, notes || null]
    });

    // Send automated notification if provider is configured
    const studentResult = await db.execute({
      sql: 'SELECT s.*, c.name as className FROM students s LEFT JOIN classes c ON s.classId = c.id WHERE s.id = ?',
      args: [studentId]
    });
    const student = studentResult.rows[0];

    if (student) {
      const displayDate = format(new Date(date), 'MMM d, yyyy');
      const classPart = student.className ? `\n*Class:* ${student.className}` : '';
      const text = `*RECEIPT OF PAYMENT*\n\n` +
                   `Hi, we have received a payment for *${student.name}*${classPart}.\n\n` +
                   `*Amount:* $${amount}\n` +
                   `*Date:* ${displayDate}\n` +
                   `*Receipt No:* ${receiptNumber}\n` +
                   `${notes ? `*Notes:* ${notes}\n` : ''}\n` +
                   `Thank you for your payment! You can download the official PDF receipt from our portal.`;
      
      await sendNotification(student.contactInfo as string, 'Payment Receipt', text);
    }

    res.json({ id: Number(result.lastInsertRowid), receiptNumber });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// Dashboard Stats
app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  try {
    // Parallelize all count and aggregate queries
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentMonthStr = `${currentYear}-${currentMonth}`;

    const [
      totalStudentsResult,
      totalClassesResult,
      monthlyRevenueResult,
      attendanceStatsResult,
      recentPaymentsResult,
      revenueByMonthResult,
      attendanceByDayResult,
      studentGrowthResult
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM students'),
      db.execute('SELECT COUNT(*) as count FROM classes'),
      db.execute({
        sql: "SELECT SUM(amount) as total FROM payments WHERE date LIKE ?",
        args: [`${currentMonthStr}%`]
      }),
      db.execute(`
        SELECT 
          COUNT(*) as total,
          SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
        FROM attendance
        WHERE date >= date('now', '-30 days')
      `),
      db.execute(`
        SELECT p.*, s.name as studentName 
        FROM payments p 
        JOIN students s ON p.studentId = s.id 
        ORDER BY p.date DESC 
        LIMIT 5
      `),
      db.execute(`
        SELECT substr(date, 1, 7) as month, SUM(amount) as amount 
        FROM payments 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `),
      db.execute(`
        SELECT 
          date,
          (SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as rate
        FROM attendance 
        WHERE date >= date('now', '-7 days')
        GROUP BY date 
        ORDER BY date ASC
      `),
      db.execute(`
        SELECT substr(createdAt, 1, 7) as month, COUNT(*) as count 
        FROM students 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `)
    ]);

    const totalStudents = Number(totalStudentsResult.rows[0]?.count || 0);
    const totalClasses = Number(totalClassesResult.rows[0]?.count || 0);
    const monthlyRevenue = Number(monthlyRevenueResult.rows[0]?.total || 0);
    
    const attendTotal = Number(attendanceStatsResult.rows[0]?.total || 0);
    const attendPresent = Number(attendanceStatsResult.rows[0]?.present || 0);
    const attendanceRate = attendTotal > 0 ? (attendPresent / attendTotal) * 100 : 0;

    res.json({
      totalStudents,
      totalClasses,
      monthlyRevenue,
      attendanceRate,
      recentPayments: recentPaymentsResult.rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount)
      })),
      revenueByMonth: revenueByMonthResult.rows.map((r: any) => ({
        month: r.month,
        amount: Number(r.amount)
      })).reverse(),
      attendanceByDay: attendanceByDayResult.rows.map((r: any) => ({
        date: r.date,
        rate: Number(r.rate)
      })),
      studentGrowth: studentGrowthResult.rows.map((r: any) => ({
        month: r.month,
        count: Number(r.count)
      })).reverse()
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({ error: 'Failed to get dashboard stats' });
  }
});

// Notifications
app.post('/api/notifications/remind', authenticateToken, async (req, res) => {
  const { studentId, dueDate, amount } = req.body;
  try {
    const studentResult = await db.execute({
      sql: 'SELECT s.*, c.name as className FROM students s LEFT JOIN classes c ON s.classId = c.id WHERE s.id = ?',
      args: [studentId]
    });
    const student = studentResult.rows[0];

    if (student) {
      const displayDate = format(new Date(dueDate), 'MMM d, yyyy');
      const classPart = student.className ? ` (Class: ${student.className})` : '';
      const text = `*PAYMENT REMINDER*\n\n` +
                   `Hi, this is a reminder that a payment for *${student.name}*${classPart} is due soon.\n\n` +
                   `*Amount Due:* $${amount}\n` +
                   `*Due Date:* ${displayDate}\n\n` +
                   `Please ignore if already paid. Thank you!`;
      
      await sendNotification(student.contactInfo as string, 'Payment Reminder', text);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// --- Vite Middleware ---
async function startServer() {
  await setupDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (req, res) => {
      if (req.path.startsWith('/api')) return res.status(404).json({ error: 'API route not found' });
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
