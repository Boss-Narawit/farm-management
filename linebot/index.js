const express = require('express');
const crypto = require('crypto');
const admin = require('firebase-admin');
const Anthropic = require('@anthropic-ai/sdk');

const app = express();

// Firebase Admin
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: process.env.FIREBASE_DATABASE_URL,
});
const db = admin.database();

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LINE_SECRET = process.env.LINE_CHANNEL_SECRET;
const LINE_TOKEN = process.env.LINE_CHANNEL_ACCESS_TOKEN;

function verifySignature(rawBody, signature) {
  const hash = crypto.createHmac('sha256', LINE_SECRET).update(rawBody).digest('base64');
  return hash === signature;
}

async function lineReply(replyToken, text) {
  const res = await fetch('https://api.line.me/v2/bot/message/reply', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${LINE_TOKEN}` },
    body: JSON.stringify({ replyToken, messages: [{ type: 'text', text }] }),
  });
  if (!res.ok) console.error('LINE reply failed:', await res.text());
}

async function fetchFarmData() {
  const dates = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    dates.push(d.toISOString().split('T')[0]);
  }

  const [mdSnap, logsSnap, oslogsSnap] = await Promise.all([
    db.ref('fm_md').once('value'),
    db.ref('fm_logs').once('value'),
    db.ref('fm_oslogs').once('value'),
  ]);

  const md = mdSnap.val() ? JSON.parse(mdSnap.val()) : {};
  const allLogs = logsSnap.val() ? JSON.parse(logsSnap.val()) : {};
  const allOsLogs = oslogsSnap.val() ? JSON.parse(oslogsSnap.val()) : {};

  const recentLogs = {};
  const recentOsLogs = {};
  for (const date of dates) {
    if (allLogs[date]) recentLogs[date] = allLogs[date];
    if (allOsLogs[date]) recentOsLogs[date] = allOsLogs[date];
  }

  return { md, recentLogs, recentOsLogs, today: dates[0] };
}

function getWage(tasks, log) {
  const task = tasks.find(t => t.name === log.task);
  if (!task || !task.dailyRate) return null;
  return log.duration === 'ครึ่งวัน' ? task.dailyRate / 2 : task.dailyRate;
}

function buildContext({ md, recentLogs, recentOsLogs, today }) {
  const employees = (md.employees || [])
    .filter(e => (e.status || 'active') === 'active')
    .map(e => (e.first + (e.last ? ' ' + e.last : '')).trim());
  const tasks = (md.tasks || []).map(t => `${t.name}(${t.dailyRate ?? '?'}บาท/วัน)`);
  const locations = (md.locations || []).map(l => l.name);

  const logLines = [];
  for (const date of Object.keys(recentLogs).sort().reverse()) {
    for (const log of recentLogs[date]) {
      const wage = getWage(md.tasks || [], log);
      logLines.push(`${date}: ${log.name} | ${log.task} | ${log.location} | ${log.duration}${wage != null ? ` | ${wage}บาท` : ''}`);
    }
  }

  const osLines = [];
  for (const date of Object.keys(recentOsLogs).sort().reverse()) {
    for (const log of recentOsLogs[date]) {
      osLines.push(`${date}: ${log.contractor} | ${log.task} | ${log.location} | ${log.fee}บาท`);
    }
  }

  return [
    `วันนี้: ${today}`,
    `พนักงาน (active): ${employees.join(', ') || 'ไม่มี'}`,
    `งาน/อัตราค่าจ้าง: ${tasks.join(', ') || 'ไม่มี'}`,
    `แปลง: ${locations.join(', ') || 'ไม่มี'}`,
    ``,
    `บันทึกงาน 7 วันล่าสุด (วันที่ | ชื่อ | งาน | แปลง | ชม. | ค่าจ้าง):`,
    ...(logLines.length ? logLines : ['ไม่มีข้อมูล']),
    ``,
    `งานจ้างเหมา 7 วันล่าสุด (วันที่ | ผู้รับเหมา | งาน | แปลง | ค่าจ้าง):`,
    ...(osLines.length ? osLines : ['ไม่มีข้อมูล']),
  ].join('\n');
}

async function askClaude(question, context) {
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 400,
    system: [
      {
        type: 'text',
        // Cache the farm context — same data across many messages within 5 min
        text: `คุณเป็นผู้ช่วยจัดการฟาร์มอ้อย ตอบเป็นภาษาไทย กระชับ ใช้ข้อมูลที่ให้มาเท่านั้น ห้ามเดา:\n\n${context}`,
        cache_control: { type: 'ephemeral' },
      },
    ],
    messages: [{ role: 'user', content: question }],
  });
  return response.content[0].text;
}

app.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['x-line-signature'];
  if (!sig || !verifySignature(req.body, sig)) return res.sendStatus(403);

  res.sendStatus(200); // Acknowledge to LINE before async work

  let body;
  try { body = JSON.parse(req.body.toString()); } catch { return; }

  for (const event of body.events || []) {
    if (event.type !== 'message' || event.message?.type !== 'text') continue;
    try {
      const farmData = await fetchFarmData();
      const context = buildContext(farmData);
      const answer = await askClaude(event.message.text, context);
      await lineReply(event.replyToken, answer);
    } catch (err) {
      console.error('Error:', err);
      await lineReply(event.replyToken, 'ขออภัย เกิดข้อผิดพลาด กรุณาลองใหม่').catch(() => {});
    }
  }
});

app.get('/', (_, res) => res.send('Farm LINE Bot OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Listening on :${PORT}`));
