import { createSupabaseServerClient } from '@/lib/supabase'
import { Resend } from 'resend'

function getResend() {
  return new Resend(process.env.RESEND_API_KEY!)
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^## (.+)$/gm, '<h2 style="font-family:Georgia,serif;color:#2C2C2C;margin:1.5em 0 0.5em">$1</h2>')
    .replace(/^\| (.+) \|$/gm, (row) => {
      const cells = row.split('|').slice(1, -1).map((c) => c.trim())
      const isHeader = false
      const tag = isHeader ? 'th' : 'td'
      return `<tr>${cells.map((c) => `<${tag} style="padding:6px 12px;border:1px solid #D4C5A9;text-align:left">${c}</${tag}>`).join('')}</tr>`
    })
    .replace(/(<tr>[\s\S]*?<\/tr>)/g, (match, _, offset, str) => {
      const before = str.slice(0, offset)
      if (!before.includes('<table')) return `<table style="border-collapse:collapse;width:100%;margin:1em 0">${match}</table>`
      return match
    })
    .replace(/^\*\*(.+?):\*\* (.+)$/gm, '<p style="margin:0.3em 0"><strong>$1:</strong> $2</p>')
    .replace(/^- (.+)$/gm, '<li style="margin:0.25em 0">$1</li>')
    .replace(/^(\d+)\. (.+)$/gm, '<li style="margin:0.25em 0">$2</li>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\n{2,}/g, '</p><p style="margin:0.5em 0">')
}

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = createSupabaseServerClient()

  const { data: submission, error } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !submission) {
    return Response.json({ error: 'Submission not found.' }, { status: 404 })
  }

  if (submission.design_status !== 'ready') {
    return Response.json({ error: 'Design has not been generated yet.' }, { status: 400 })
  }

  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return Response.json({ error: 'Email service not configured.' }, { status: 500 })
  }

  const resend = getResend()
  const plantListHtml = markdownToHtml(submission.plant_list ?? '')

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#F7F4EE;font-family:Arial,sans-serif;color:#2C2C2C">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px">

    <p style="font-size:22px;font-family:Georgia,serif;color:#2C2C2C;margin:0 0 4px">Leaf &amp; Form</p>
    <p style="color:#7C9A7E;font-size:11px;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 32px">Garden Design</p>

    <h1 style="font-family:Georgia,serif;font-size:28px;color:#2C2C2C;margin:0 0 12px">Your garden design is ready</h1>
    <p style="color:#5A5A5A;margin:0 0 32px">Hi ${submission.name}, here is your bespoke planting plan for your garden in <strong>${submission.location}</strong>.</p>

    <p style="font-size:11px;letter-spacing:0.12em;text-transform:uppercase;color:#9A9A8A;margin:0 0 8px">Your Garden Visualisation</p>
    <img src="${submission.design_image_url}" alt="Your bespoke garden design" style="width:100%;border-radius:12px;display:block;margin-bottom:32px">

    <div style="background:#EDE9E1;border-radius:12px;padding:24px 28px;margin-bottom:32px">
      ${plantListHtml}
    </div>

    <p style="color:#5A5A5A;font-size:14px;margin:0 0 8px">Questions about your design? Reply to this email and we will be happy to help.</p>
    <p style="color:#9A9A8A;font-size:12px;margin:0">Leaf &amp; Form · <a href="mailto:${process.env.RESEND_FROM_EMAIL}" style="color:#7C9A7E">${process.env.RESEND_FROM_EMAIL}</a></p>

  </div>
</body>
</html>`

  const { error: emailError } = await resend.emails.send({
    from: `Leaf & Form <${process.env.RESEND_FROM_EMAIL}>`,
    to: submission.email,
    subject: 'Your Leaf & Form garden design is ready',
    html,
  })

  if (emailError) {
    console.error('Resend error:', emailError)
    return Response.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
  }

  await supabase
    .from('submissions')
    .update({ design_status: 'sent', sent_at: new Date().toISOString() })
    .eq('id', id)

  return Response.json({ ok: true })
}
