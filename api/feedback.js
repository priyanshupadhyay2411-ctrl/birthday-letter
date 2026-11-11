// Vercel serverless function: POST /api/feedback
// Emails the rating + remark to you using Resend (https://resend.com).
// Needs two environment variables set in Vercel:
//   RESEND_API_KEY  -> your Resend API key
//   TO_EMAIL        -> the email where you want to receive the reviews

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { rating, remark } = req.body || {};
  const r = Number(rating);
  if (!Number.isInteger(r) || r < 1 || r > 5) {
    return res.status(400).json({ error: 'Rating must be 1 to 5' });
  }
  const text = String(remark || '').slice(0, 5000);

  const { RESEND_API_KEY, TO_EMAIL } = process.env;
  if (!RESEND_API_KEY || !TO_EMAIL) {
    return res.status(500).json({ error: 'Server is not configured' });
  }

  const stars = '★'.repeat(r) + '☆'.repeat(5 - r);

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Birthday Letter <onboarding@resend.dev>',
        to: [TO_EMAIL],
        subject: `Letter review: ${stars} (${r}/5)`,
        html: `<h2>${stars} &nbsp; ${r}/5</h2>
               <p style="white-space:pre-wrap;font-size:16px">${text ? esc(text) : '<i>(no remarks)</i>'}</p>`
      })
    });

    if (!resp.ok) {
      console.error('Resend error:', resp.status, await resp.text());
      return res.status(502).json({ error: 'Email failed' });
    }
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Something went wrong' });
  }
};
