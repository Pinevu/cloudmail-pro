/**
 * CloudMail Pro 邮件接收处理器
 * 处理 Cloudflare Email Routing 转发的邮件
 */
import type { EmailMessage, EmailAttachment, Env } from '../utils/types'
import { generateMailId, generateAddressId, now, safeJsonStringify } from '../utils/helpers'
import { mails, mailAddresses, users, attachments } from '../entity'
import { eq, and } from 'drizzle-orm'

export async function handleEmail(message: ForwardableEmailMessage, env: Env): Promise<void> {
  console.log(`[Email] Received: from=${message.from}, to=${message.to}`)

  const db = env.DB

  try {
    // 查找目标地址对应的用户
    const address = await db.select().from(mailAddresses)
      .where(and(
        eq(mailAddresses.address, message.to),
        eq(mailAddresses.status, 'active'),
      ))
      .get()

    if (!address) {
      console.warn(`[Email] No address found for: ${message.to}`)
      // 可以转发到默认邮箱或忽略
      return
    }

    const userId = address.userId

    // 解析邮件内容
    const emailContent = await parseEmailContent(message)

    // 保存附件到 R2
    const attachmentRecords = []
    let hasAttachments = 0

    if (emailContent.attachments.length > 0) {
      hasAttachments = 1
      for (const attachment of emailContent.attachments) {
        const attachmentId = generateAddressId() // reuse as unique ID
        const r2Key = `attachments/${userId}/${attachmentId}/${attachment.filename}`

        // 上传到 R2
        await env.R2.put(r2Key, attachment.content, {
          httpMetadata: { contentType: attachment.mimeType },
          customMetadata: {
            userId,
            mailFrom: message.from,
            originalFilename: attachment.filename,
          },
        })

        await db.insert(attachments).values({
          id: attachmentId,
          userId,
          mailId: '', // 先插入邮件后再更新
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.size,
          r2Key,
          isInline: attachment.isInline ? 1 : 0,
          contentId: attachment.contentId || null,
          createdAt: now(),
        })

        attachmentRecords.push({
          id: attachmentId,
          filename: attachment.filename,
          mimeType: attachment.mimeType,
          sizeBytes: attachment.size,
        })
      }
    }

    // 保存邮件到数据库
    const mailId = generateMailId()
    await db.insert(mails).values({
      id: mailId,
      userId,
      addressId: address.id,
      messageId: message.headers.get('message-id') || mailId,
      direction: 'inbound',
      fromAddress: message.from,
      fromName: extractNameFromAddress(message.from),
      toAddresses: safeJsonStringify([{ address: message.to, name: null }]),
      ccAddresses: null,
      bccAddresses: null,
      subject: message.headers.get('subject') || '(无主题)',
      contentPlain: emailContent.contentPlain,
      contentHtml: emailContent.contentHtml,
      hasAttachments,
      attachmentsJson: hasAttachments ? safeJsonStringify(attachmentRecords) : null,
      status: 'delivered',
      deliveredAt: now(),
      createdAt: now(),
      updatedAt: now(),
    })

    // 更新附件中的 mailId
    for (const ar of attachmentRecords) {
      await db.update(attachments).set({ mailId }).where(eq(attachments.id, ar.id))
    }

    // 处理转发
    if (address.forwardingEnabled && address.forwardingTo) {
      await forwardEmail(env, address.forwardingTo, emailContent, message)
    }

    // 处理 Telegram 推送
    const user = await db.select().from(users).where(eq(users.id, userId)).get()
    if (user?.telegramEnabled && user?.telegramChatId) {
      await sendTelegramNotification(env, user.telegramChatId, message, emailContent)
    }

    console.log(`[Email] Saved: mailId=${mailId}`)
  } catch (err: any) {
    console.error(`[Email] Error processing: ${err.message}`, err.stack)
  }
}

// ============ 解析邮件内容 ============
async function parseEmailContent(message: ForwardableEmailMessage): Promise<EmailMessage> {
  const readable = message.raw
  const rawText = await new Response(readable).text()

  // 简易解析（生产环境应使用 postal-mime 等专门库）
  const subject = message.headers.get('subject') || ''
  const from = message.from
  const to = message.to

  // 提取正文
  let contentPlain = ''
  let contentHtml = ''

  // 简单分割 HTML 和纯文本内容
  const htmlMatch = rawText.match(/Content-Type: text\/html[\s\S]*?\n\n([\s\S]*?)(?=\n--|\nContent-Type:)/i)
  const plainMatch = rawText.match(/Content-Type: text\/plain[\s\S]*?\n\n([\s\S]*?)(?=\n--|\nContent-Type:)/i)

  if (htmlMatch) contentHtml = htmlMatch[1].trim()
  if (plainMatch) contentPlain = plainMatch[1].trim()
  if (!contentPlain && !contentHtml) contentPlain = rawText

  return {
    from,
    to,
    subject,
    contentPlain,
    contentHtml,
    attachments: [], // 附件解析需使用专门库
    headers: Object.fromEntries(message.headers.entries()),
  }
}

// ============ 转发邮件 ============
async function forwardEmail(env: Env, forwardTo: string, emailContent: EmailMessage, originalMessage: ForwardableEmailMessage): Promise<void> {
  try {
    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `${env.RESEND_FROM_NAME || 'CloudMail Pro'} <${env.RESEND_FROM_EMAIL}>`,
        to: [forwardTo],
        subject: `[Forward] ${emailContent.subject}`,
        html: emailContent.contentHtml || `<pre>${emailContent.contentPlain}</pre>`,
        text: emailContent.contentPlain,
      }),
    })
    console.log(`[Email] Forwarded to: ${forwardTo}`)
  } catch (err: any) {
    console.error(`[Email] Forward error: ${err.message}`)
  }
}

// ============ Telegram 推送 ============
async function sendTelegramNotification(env: Env, chatId: string, message: ForwardableEmailMessage, emailContent: EmailMessage): Promise<void> {
  try {
    const text = [
      `📧 *新邮件*`,
      `发件人: ${message.from}`,
      `主题: ${emailContent.subject}`,
      `内容预览: ${emailContent.contentPlain?.slice(0, 200) || '(无预览)'}`,
    ].join('\n')

    await fetch(`https://api.telegram.org/bot${env.TG_BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })
    console.log(`[Email] Telegram notification sent to: ${chatId}`)
  } catch (err: any) {
    console.error(`[Email] Telegram error: ${err.message}`)
  }
}

// ============ 工具函数 ============
function extractNameFromAddress(address: string): string | null {
  const match = address.match(/^"?(.+?)"?\s*<.*>$/)
  return match ? match[1] : null
}

// Cloudflare Email Worker 类型
interface ForwardableEmailMessage {
  from: string
  to: string
  raw: ReadableStream
  headers: Headers
  rawSize: number
}