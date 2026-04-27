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

interface SubscriptionEmailProps {
  recipientName?: string
  plan?: string
  billingPeriod?: string
  expiresAt?: string
  eventType?: 'activated' | 'renewed' | 'expiring' | 'expired'
  maxProducts?: number
  bonusTokens?: number
}

const labels: Record<string, { title: string; intro: string }> = {
  activated: {
    title: '✅ Abonnement activé',
    intro: 'Votre nouvel abonnement est actif. Vous pouvez profiter de toutes les fonctionnalités dès maintenant.',
  },
  renewed: {
    title: '🔄 Abonnement renouvelé',
    intro: 'Votre abonnement vient d\'être renouvelé avec succès. Merci de votre confiance.',
  },
  expiring: {
    title: '⏳ Abonnement bientôt expiré',
    intro: 'Votre abonnement arrive à expiration. Renouvelez-le pour conserver l\'accès à toutes les fonctionnalités.',
  },
  expired: {
    title: '❌ Abonnement expiré',
    intro: 'Votre abonnement est arrivé à expiration. Réactivez-le pour reprendre l\'accès complet.',
  },
}

const SubscriptionEmail = ({
  recipientName,
  plan = 'Pro',
  billingPeriod = 'monthly',
  expiresAt,
  eventType = 'activated',
  maxProducts,
  bonusTokens,
}: SubscriptionEmailProps) => {
  const meta = labels[eventType] || labels.activated
  const url = `${SITE_URL}/plans`
  const expiry = expiresAt ? new Date(expiresAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }) : null
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{meta.title} – Plan {plan} sur {SITE_NAME}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="80" height="80" style={logo} />
          <Heading style={h1}>{meta.title}</Heading>
          <Text style={text}>Bonjour{recipientName ? ` ${recipientName}` : ''},</Text>
          <Text style={text}>{meta.intro}</Text>

          <Section style={card}>
            <Text style={cardLine}><strong>Plan :</strong> {plan}</Text>
            <Text style={cardLine}><strong>Facturation :</strong> {billingPeriod === 'yearly' ? 'Annuelle' : 'Mensuelle'}</Text>
            {typeof maxProducts === 'number' ? (
              <Text style={cardLine}><strong>Produits inclus :</strong> jusqu'à {maxProducts}</Text>
            ) : null}
            {typeof bonusTokens === 'number' && bonusTokens > 0 ? (
              <Text style={cardLine}><strong>🎁 Jetons offerts :</strong> {bonusTokens}</Text>
            ) : null}
            {expiry ? (
              <Text style={cardLine}><strong>Expire le :</strong> {expiry}</Text>
            ) : null}
          </Section>

          <Button style={button} href={url}>Gérer mon abonnement</Button>
          <Text style={footer}>
            Merci de faire grandir l'agriculture africaine avec {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: SubscriptionEmail,
  subject: (data) => {
    const map: Record<string, string> = {
      activated: `✅ Plan ${data.plan || 'Pro'} activé sur ${SITE_NAME}`,
      renewed: `🔄 Plan ${data.plan || 'Pro'} renouvelé sur ${SITE_NAME}`,
      expiring: `⏳ Votre plan ${data.plan || 'Pro'} expire bientôt`,
      expired: `❌ Votre plan ${data.plan || 'Pro'} a expiré`,
    }
    return map[data.eventType as string] || map.activated
  },
  displayName: 'Abonnement (activation/renouvellement)',
  previewData: {
    recipientName: 'Awa',
    plan: 'Premium',
    billingPeriod: 'monthly',
    expiresAt: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(),
    eventType: 'activated',
    maxProducts: 200,
    bonusTokens: 500,
  },
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px', maxWidth: '600px' }
const logo = { margin: '0 auto 24px', display: 'block', objectFit: 'contain' as const, width: '80px', height: '80px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(120, 100%, 25%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(210, 10%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const card = { background: 'hsl(120, 30%, 96%)', padding: '16px 18px', borderRadius: '12px', margin: '12px 0 20px', border: '1px solid hsl(120, 30%, 88%)' }
const cardLine = { fontSize: '13px', color: 'hsl(210, 10%, 25%)', margin: '4px 0' }
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

export default SubscriptionEmail
