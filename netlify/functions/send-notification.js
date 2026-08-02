// netlify/functions/send-notification.js
// يستقبل طلباً من app.html (لوحة الأدمن) ويرسل إشعار Push حقيقي عبر OneSignal.
// مفتاح OneSignal السرّي (REST API Key) لا يُكتب هنا أبداً — يُقرأ من متغيرات بيئة Netlify،
// حتى لا يظهر لأي زائر يفتح "عرض مصدر الصفحة" على الموقع.

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
  const ONESIGNAL_REST_API_KEY = process.env.ONESIGNAL_REST_API_KEY;

  if (!ONESIGNAL_APP_ID || !ONESIGNAL_REST_API_KEY) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'لم يتم ضبط متغيرات البيئة ONESIGNAL_APP_ID / ONESIGNAL_REST_API_KEY على Netlify' })
    };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON body' }) };
  }

  const { title, body, url, externalId } = payload;
  if (!title || !body) {
    return { statusCode: 400, body: JSON.stringify({ error: 'title و body مطلوبان' }) };
  }

  const notification = {
    app_id: ONESIGNAL_APP_ID,
    headings: { en: title, ar: title },
    contents: { en: body, ar: body },
    url: url || undefined
  };

  if (externalId) {
    // إشعار موجَّه لطالب محدد (تحديث حالة طلب طباعة)
    notification.include_aliases = { external_id: [String(externalId)] };
    notification.target_channel = 'push';
  } else {
    // إشعار بث لكل الطلاب المشتركين (محتوى جديد)
    // ملاحظة: OneSignal غيّر الاسم الافتراضي لهذه الشريحة من "Subscribed Users" إلى "Total Subscriptions"
    notification.included_segments = ['Total Subscriptions'];
    notification.target_channel = 'push';
  }

  try {
    const res = await fetch('https://api.onesignal.com/notifications', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Authorization': `Key ${ONESIGNAL_REST_API_KEY}`
      },
      body: JSON.stringify(notification)
    });
    const data = await res.json();
    return {
      statusCode: res.ok ? 200 : res.status,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
  }
};
