/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NukuConnect'
const SITE_URL = 'https://www.nukuconnect.com'
const LOGO_URL = 'https://fpnhdihvnfsiymopbjgt.supabase.co/storage/v1/object/public/email-assets/nukuconnect-logo.png'

interface NewMessageEmailProps {
  recipientName?: string
  senderName?: string
  preview?: string
  productName?: string
  conversationUrl?: string
}

const NewMessageEmail = ({
  recipientName,
  senderName,
  preview,
  productName,
  conversationUrl,
}: NewMessageEmailProps) => {
  const url = conversationUrl || `${SITE_URL}/messages`
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{senderName || 'Un utilisateur'} vous a envoyé un message sur {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="80" height="80" style={logo} />
          <Heading style={h1}>💬 Nouveau message</Heading>
          <Text style={text}>
            Bonjour{recipientName ? ` ${recipientName}` : ''},
          </Text>
          <Text style={text}>
            <strong>{senderName || 'Un utilisateur'}</strong> vous a envoyé un message
            {productName ? <> à propos de <strong>{productName}</strong></> : null}.
          </Text>
          {preview ? (
            <Section style={quoteBox}>
              <Text style={quoteText}>« {preview} »</Text>
            </Section>
          ) : null}
          <Button style={button} href={url}>Répondre maintenant</Button>
          <Text style={text}>
            Ou copiez ce lien dans votre navigateur :<br />
            <a href={url} style={link}>{url}</a>
          </Text>
          <Text style={footer}>
            Vous recevez cet email car vous êtes membre de {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: NewMessageEmail,
  subject: (data) => `💬 ${data.senderName || 'Un utilisateur'} vous a envoyé un message`,
  displayName: 'Nouveau message',
  previewData: {
    recipientName: 'Awa',
    senderName: 'Kossi',
    productName: 'Maïs blanc 50kg',
    preview: 'Bonjour, est-ce que vous pouvez livrer à Lomé ?',
    conversationUrl: 'https://www.nukuconnect.com/messages',
  },
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px', maxWidth: '600px' }
const logo = { margin: '0 auto 24px', display: 'block', objectFit: 'contain' as const, width: '80px', height: '80px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(120, 100%, 25%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(210, 10%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const link = { color: 'hsl(207, 85%, 52%)', textDecoration: 'underline', wordBreak: 'break-all' as const }
const quoteBox = { background: 'hsl(120, 30%, 96%)', borderLeft: '4px solid hsl(120, 100%, 25%)', padding: '12px 16px', borderRadius: '8px', margin: '12px 0 20px' }
const quoteText = { fontSize: '13px', color: 'hsl(210, 10%, 30%)', fontStyle: 'italic' as const, margin: 0 }
const button = {
  backgroundColor: 'hsl(120, 100%, 25%)',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  borderRadius: '12px',
  padding: '14px 28px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  display: 'inline-block',
  margin: '8px 0 24px',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

export default NewMessageEmail
