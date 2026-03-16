import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@libsql/client';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { 
  format, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  subDays, 
  startOfMonth, 
  endOfMonth,
  addDays,
  isSameMonth,
  startOfISOWeek,
  eachWeekOfInterval
} from 'date-fns';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-in-production';

app.use(cors());
app.use(express.json());

// Request Logger
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} | ${req.method} ${req.url}`);
  if (req.method === 'POST') console.log('Body:', JSON.stringify(req.body));
  next();
});

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

async function sendNotification(recipient: { phone: string; email?: string | null }, subject: string, body: string) {
  try {
    const result = await db.execute('SELECT key, value FROM settings WHERE key IN ("whatsappPhoneNumberId", "whatsappAccessToken", "whatsappProvider", "enableWhatsappNotifications", "enableEmailNotifications", "resendApiKey", "fromEmail")');
    const config: Record<string, string> = {};
    result.rows.forEach(row => {
      config[row.key as string] = row.value as string;
    });

    // 1. WhatsApp Notification
    if (config.enableWhatsappNotifications === 'true') {
      const provider = config.whatsappProvider || 'manual';
      const cleanNumber = recipient.phone.replace(/\D/g, '');

    if (provider === 'rocketsender') {
      const apiKey = config.rocketSenderApiKey;
      const deviceId = config.rocketSenderDeviceId;

      if (!apiKey || !deviceId) {
        console.log(`[SIMULATED ROCKETSENDER] To: ${recipient.phone} | Message: ${body}`);
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
        console.log(`[SIMULATED META WHATSAPP] To: ${recipient.phone} | Message: ${body}`);
        console.log('Configure WhatsApp API in Settings to send real messages.');
      } else {
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
        }
      }
    }

    // 2. Email Notification
    if (config.enableEmailNotifications === 'true' && recipient.email) {
      const resendApiKey = config.resendApiKey;
      const fromEmail = config.fromEmail || 'notifications@resend.dev';

      if (!resendApiKey) {
        console.log(`[SIMULATED EMAIL] To: ${recipient.email} | From: ${fromEmail} | Subject: ${subject} | Body: ${body}`);
      } else {
        const emailResponse = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${resendApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: `SwiftRollCall <${fromEmail}>`,
            to: recipient.email,
            subject: subject,
            html: body.replace(/\n/g, '<br>')
          })
        });

        if (!emailResponse.ok) {
          const emailData = await emailResponse.json();
          console.error('Resend API Error:', emailData);
        } else {
          console.log(`Successfully sent email to ${recipient.email}`);
        }
      }
    }
  } catch (error) {
    console.error('Notification Error:', error);
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
      email TEXT,
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

    CREATE TABLE IF NOT EXISTS parent_users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE,
      phone TEXT UNIQUE,
      password TEXT NOT NULL,
      name TEXT,
      createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Migrations for users table
  try {
    await db.execute("ALTER TABLE users ADD COLUMN darkMode INTEGER DEFAULT 0");
  } catch (e) {}

  try {
    await db.execute("ALTER TABLE users ADD COLUMN username TEXT");
  } catch (e) {}

  try {
    await db.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)");
  } catch (e) {}

  // Migration for students table
  try {
    await db.execute("ALTER TABLE students ADD COLUMN email TEXT");
  } catch (e) {}

  // Basic settings initialization
  await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('receiptTemplate', 'modern')");
  await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('whatsappProvider', 'manual')");
  await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('enableWhatsappNotifications', 'true')");
  await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('emailProvider', 'manual')");
  await db.execute("INSERT OR IGNORE INTO settings (key, value) VALUES ('enableEmailNotifications', 'false')");

  await db.executeMultiple(`
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
  const { name, parentName, contactInfo, subjects, classId, rateType, rateAmount, email } = req.body;
  try {
    const result = await db.execute({
      sql: 'INSERT INTO students (name, parentName, contactInfo, subjects, classId, rateType, rateAmount, email) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      args: [name, parentName || null, contactInfo, subjects, classId || null, rateType, rateAmount, email || null]
    });
    res.json({ id: Number(result.lastInsertRowid) });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to create student' });
  }
});

app.put('/api/students/:id', async (req, res) => {
  const { name, parentName, contactInfo, subjects, classId, rateType, rateAmount, email } = req.body;
  try {
    await db.execute({
      sql: 'UPDATE students SET name = ?, parentName = ?, contactInfo = ?, subjects = ?, classId = ?, rateType = ?, rateAmount = ?, email = ? WHERE id = ?',
      args: [name, parentName || null, contactInfo, subjects, classId || null, rateType, rateAmount, email || null, req.params.id]
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

app.post('/api/attendance/bulk', async (req, res) => {
  const { records, date } = req.body;
  const notifications: any[] = [];
  
  try {
    for (const record of records) {
      const { studentId, status } = record;
      
      // Delete existing for the same day to avoid duplicates
      await db.execute({
        sql: 'DELETE FROM attendance WHERE studentId = ? AND date = ?',
        args: [studentId, date]
      });

      // Insert new record
      await db.execute({
        sql: 'INSERT INTO attendance (studentId, date, status) VALUES (?, ?, ?)',
        args: [studentId, date, status]
      });

      // Prepare notification data
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
          notifications.push({ 
            text, 
            phone: student.contactInfo as string, 
            email: student.email as string,
            studentName: student.name
          });
          
          // Also try to send automated if configured (Master toggles checked in sendNotification)
          await sendNotification({ phone: student.contactInfo as string, email: student.email as string }, 'Attendance Update', text);
        }
      }
    }
    res.json({ success: true, notifications });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record bulk attendance' });
  }
});

app.post('/api/attendance', async (req, res) => {
  const { studentId, date, status, notes } = req.body;
  let notification: any = null;
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
        notification = { text, phone: student.contactInfo as string, email: student.email as string };
        await sendNotification({ phone: student.contactInfo as string, email: student.email as string }, 'Attendance Update', text);
      }
    }
    res.json({ id: Number(result.lastInsertRowid), notification });
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
  let notification: any = null;
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
      
      notification = { text, phone: student.contactInfo as string, email: student.email as string };
      await sendNotification({ phone: student.contactInfo as string, email: student.email as string }, 'Payment Receipt', text);
    }

    res.json({ id: Number(result.lastInsertRowid), receiptNumber, notification });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

app.get('/api/dashboard/stats', authenticateToken, async (req, res) => {
  const classId = req.query.classId ? Number(req.query.classId) : null;
  const period = (req.query.period as string) || 'weekly';
  const feePeriod = Number(req.query.feePeriod) || 6;
  
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
    const currentMonthStr = `${currentYear}-${currentMonth}`;
    const todayStr = format(now, 'yyyy-MM-dd');

    // Attendance Date Ranges
    let attendanceData: { date: string; rate: number }[] = [];
    if (period === 'weekly') {
      const start = startOfWeek(now, { weekStartsOn: 0 });
      const end = endOfWeek(now, { weekStartsOn: 0 });
      const days = eachDayOfInterval({ start, end });
      
      const results = await db.execute({
        sql: `
          SELECT 
            date,
            (SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) * 100.0 / COUNT(*)) as rate
          FROM attendance a
          JOIN students s ON a.studentId = s.id
          WHERE a.date BETWEEN ? AND ?
          AND (? IS NULL OR s.classId = ?)
          GROUP BY date
        `,
        args: [format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'), classId, classId]
      });

      attendanceData = days.map(d => {
        const dateStr = format(d, 'yyyy-MM-dd');
        const match = results.rows.find(r => r.date === dateStr);
        return {
          date: dateStr,
          rate: match ? Number(match.rate) : 0
        };
      });
    } else {
      // Monthly view - all weeks in current month
      const start = startOfMonth(now);
      const end = endOfMonth(now);
      const weeks = eachWeekOfInterval({ start, end }, { weekStartsOn: 0 });

      const results = await db.execute({
        sql: `
          SELECT 
            date,
            (CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as isPresent
          FROM attendance a
          JOIN students s ON a.studentId = s.id
          WHERE a.date BETWEEN ? AND ?
          AND (? IS NULL OR s.classId = ?)
        `,
        args: [format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd'), classId, classId]
      });

      attendanceData = weeks.map((wStart, idx) => {
        const wEnd = endOfWeek(wStart, { weekStartsOn: 0 });
        const recordsInWeek = results.rows.filter(r => {
          const d = (r.date as string);
          return d >= format(wStart, 'yyyy-MM-dd') && d <= format(wEnd, 'yyyy-MM-dd');
        });

        const total = recordsInWeek.length;
        const present = recordsInWeek.filter(r => r.isPresent === 1).length;

        return {
          date: `Week ${idx + 1}`,
          rate: total > 0 ? (present / total) * 100 : 0
        };
      });
    }

    const [
      totalStudentsResult,
      totalClassesResult,
      monthlyRevenueResult,
      attendanceRateResult,
      recentPaymentsResult,
      revenueByMonthResult,
      studentGrowthResult,
      unpaidStudentsResult,
      missingAttendanceResult
    ] = await Promise.all([
      db.execute('SELECT COUNT(*) as count FROM students'),
      db.execute('SELECT COUNT(*) as count FROM classes'),
      db.execute({
        sql: "SELECT SUM(amount) as total FROM payments WHERE date LIKE ?",
        args: [`${currentMonthStr}%`]
      }),
      db.execute({
        sql: `
          SELECT 
            COUNT(*) as total,
            SUM(CASE WHEN status = 'Present' THEN 1 ELSE 0 END) as present
          FROM attendance a
          JOIN students s ON a.studentId = s.id
          WHERE a.date >= date('now', '-30 days')
          AND (? IS NULL OR s.classId = ?)
        `,
        args: [classId, classId]
      }),
      db.execute(`
        SELECT p.*, s.name as studentName 
        FROM payments p 
        JOIN students s ON p.studentId = s.id 
        ORDER BY p.date DESC 
        LIMIT 5
      `),
      db.execute({
        sql: `
          SELECT substr(date, 1, 7) as month, SUM(amount) as amount 
          FROM payments 
          GROUP BY month 
          ORDER BY month DESC 
          LIMIT ?
        `,
        args: [feePeriod]
      }),
      db.execute(`
        SELECT substr(createdAt, 1, 7) as month, COUNT(*) as count 
        FROM students 
        GROUP BY month 
        ORDER BY month DESC 
        LIMIT 6
      `),
      db.execute({
        sql: `
          SELECT COUNT(*) as count 
          FROM students s 
          WHERE NOT EXISTS (
            SELECT 1 FROM payments p 
            WHERE p.studentId = s.id 
            AND p.date LIKE ?
          )
        `,
        args: [`${currentMonthStr}%`]
      }),
      db.execute({
        sql: `
          SELECT COUNT(*) as count 
          FROM classes c 
          WHERE NOT EXISTS (
            SELECT 1 FROM attendance a 
            JOIN students s ON a.studentId = s.id
            WHERE s.classId = c.id
            AND a.date = ?
          )
        `,
        args: [todayStr]
      })
    ]);

    const totalStudents = Number(totalStudentsResult.rows[0]?.count || 0);
    const totalClasses = Number(totalClassesResult.rows[0]?.count || 0);
    const monthlyRevenue = Number(monthlyRevenueResult.rows[0]?.total || 0);
    
    const attendTotal = Number(attendanceRateResult.rows[0]?.total || 0);
    const attendPresent = Number(attendanceRateResult.rows[0]?.present || 0);
    const attendanceRate = attendTotal > 0 ? (attendPresent / attendTotal) * 100 : 0;

    const pendingActions = Number(unpaidStudentsResult.rows[0]?.count || 0) + Number(missingAttendanceResult.rows[0]?.count || 0);

    res.json({
      totalStudents,
      totalClasses,
      monthlyRevenue,
      attendanceRate,
      pendingActions,
      recentPayments: recentPaymentsResult.rows.map((r: any) => ({
        ...r,
        amount: Number(r.amount)
      })),
      revenueByMonth: revenueByMonthResult.rows.map((r: any) => ({
        month: r.month,
        amount: Number(r.amount)
      })).reverse(),
      attendanceByDay: attendanceData,
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
      
      await sendNotification({ phone: student.contactInfo as string, email: student.email as string }, 'Payment Reminder', text);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to send reminder' });
  }
});

// --- Mobile App API Routes ---

// Verify Students for Signup
app.post('/api/mobile/auth/verify-students', async (req, res) => {
  const { identifier } = req.body; // email or phone
  if (!identifier) return res.status(400).json({ error: 'Identifier is required' });
  const cleanId = String(identifier).trim().toLowerCase();
  const phoneId = String(identifier).trim(); // Keep original for phone match just in case
  
  try {
    const result = await db.execute({
      sql: `
        SELECT s.id, s.name, s.email, s.contactInfo, c.name as className 
        FROM students s 
        LEFT JOIN classes c ON s.classId = c.id 
        WHERE LOWER(TRIM(s.email)) = ? OR TRIM(s.contactInfo) = ? OR TRIM(s.contactInfo) = ?
      `,
      args: [cleanId, cleanId, phoneId]
    });
    
    res.json({ students: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to verify students' });
  }
});

// Parent Signup
app.post('/api/mobile/auth/signup', async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.execute({
      sql: 'INSERT INTO parent_users (name, email, phone, password) VALUES (?, ?, ?, ?)',
      args: [name || null, email || null, phone || null, hashedPassword]
    });
    
    const token = jwt.sign({ id: Number(result.lastInsertRowid), parentEmail: email, parentPhone: phone, role: 'parent' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: Number(result.lastInsertRowid), name, email, phone } });
  } catch (error: any) {
    if (error.message?.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Account already exists for this email or phone' });
    }
    console.error(error);
    res.status(500).json({ error: 'Failed to create parent account' });
  }
});

// Parent Login
app.post('/api/mobile/auth/login', async (req, res) => {
  const { identifier, password } = req.body; // identifier can be email or phone
  try {
    const result = await db.execute({
      sql: 'SELECT * FROM parent_users WHERE email = ? OR phone = ?',
      args: [identifier, identifier]
    });
    
    const user = result.rows[0];
    if (!user) {
      return res.status(401).json({ error: 'Invalid login details' });
    }

    const validPassword = await bcrypt.compare(password, user.password as string);
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid login details' });
    }

    const token = jwt.sign({ id: user.id, parentEmail: user.email, parentPhone: user.phone, role: 'parent' }, JWT_SECRET, { expiresIn: '30d' });
    res.json({ token, user: { id: user.id, name: user.name, email: user.email, phone: user.phone } });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Middleware for parent
const authenticateParent = (req: any, res: any, next: any) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access denied' });

  jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    if (user.role !== 'parent') return res.status(403).json({ error: 'Not a parent account' });
    req.user = user;
    next();
  });
};

// Parent Dashboard Data (Students, attendance, payments)
app.get('/api/mobile/dashboard', authenticateParent, async (req: any, res: any) => {
  try {
    const { parentEmail, parentPhone } = req.user;
    
    const studentsResult = await db.execute({
      sql: "SELECT s.*, c.name as className FROM students s LEFT JOIN classes c ON s.classId = c.id WHERE (s.email IS NOT NULL AND s.email != '' AND s.email = ?) OR (s.contactInfo IS NOT NULL AND s.contactInfo != '' AND s.contactInfo = ?)",
      args: [parentEmail || '', parentPhone || ''] 
    });
    
    const students = studentsResult.rows;
    if (students.length === 0) {
       return res.json({ students: [], attendance: [], payments: [] });
    }

    const studentIds = students.map((s: any) => s.id);
    const inClause = studentIds.map(() => '?').join(',');

    const attendanceResult = await db.execute({
      sql: "SELECT * FROM attendance WHERE studentId IN (" + inClause + ") ORDER BY date DESC LIMIT 50",
      args: studentIds
    });

    const paymentsResult = await db.execute({
      sql: "SELECT * FROM payments WHERE studentId IN (" + inClause + ") ORDER BY date DESC LIMIT 50",
      args: studentIds
    });

    res.json({
      students,
      attendance: attendanceResult.rows,
      payments: paymentsResult.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to load parent dashboard' });
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
    // Serve Parent Portal
    const parentDistPath = path.resolve(__dirname, 'mobile', 'dist');
    app.use('/parent', express.static(parentDistPath));
    app.get('/parent*', (req, res) => {
      res.sendFile(path.join(parentDistPath, 'index.html'));
    });

    // Serve Main App
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
