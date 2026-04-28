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

interface Props {
  recipientName?: string
  productName?: string
  status?: 'approved' | 'rejected'
  reason?: string
  productUrl?: string
}

const ProductModerationEmail = ({
  recipientName,
  productName,
  status = 'approved',
  reason,
  productUrl,
}: Props) => {
  const approved = status === 'approved'
  const url = productUrl || `${SITE_URL}/dashboard`
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {approved
          ? `✅ Votre produit ${productName || ''} a été approuvé`
          : `❌ Votre produit ${productName || ''} n'a pas été approuvé`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="80" height="80" style={logo} />
          <Heading style={approved ? h1Ok : h1Ko}>
            {approved ? '✅ Produit approuvé !' : '❌ Produit non approuvé'}
          </Heading>
          <Text style={text}>Bonjour{recipientName ? ` ${recipientName}` : ''},</Text>

          {approved ? (
            <>
              <Text style={text}>
                Bonne nouvelle ! Votre produit <strong>{productName}</strong> a été
                vérifié et validé par notre équipe Nukuconnect. Il est désormais visible
                sur la marketplace et accessible aux acheteurs.
              </Text>
              <Button style={buttonOk} href={url}>Voir mon produit</Button>
            </>
          ) : (
            <>
              <Text style={text}>
                Après analyse, votre produit <strong>{productName}</strong> n'a pas pu
                être publié sur la marketplace.
              </Text>
              {reason ? (
                <Section style={quoteBox}>
                  <Text style={quoteText}>Motif : {reason}</Text>
                </Section>
              ) : null}
              <Text style={text}>
                Vous pouvez modifier votre publication et la soumettre à nouveau depuis
                votre tableau de bord. Notre équipe reste disponible pour vous accompagner.
              </Text>
              <Button style={buttonKo} href={url}>Modifier mon produit</Button>
            </>
          )}

          <Text style={footer}>
            Vous recevez cet email car vous êtes fournisseur sur {SITE_NAME}.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: ProductModerationEmail,
  subject: (data) =>
    data.status === 'rejected'
      ? `❌ Votre produit "${data.productName || ''}" n'a pas été approuvé`
      : `✅ Votre produit "${data.productName || ''}" a été approuvé !`,
  displayName: 'Modération produit',
  previewData: {
    recipientName: 'Awa',
    productName: 'Maïs blanc 50kg',
    status: 'approved',
    productUrl: 'https://www.nukuconnect.com/dashboard',
  },
}

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px', maxWidth: '600px' }
const logo = { margin: '0 auto 24px', display: 'block', objectFit: 'contain' as const, width: '80px', height: '80px' }
const h1Ok = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(120, 100%, 25%)', margin: '0 0 20px' }
const h1Ko = { fontSize: '22px', fontWeight: 'bold' as const, color: 'hsl(0, 75%, 45%)', margin: '0 0 20px' }
const text = { fontSize: '14px', color: 'hsl(210, 10%, 30%)', lineHeight: '1.6', margin: '0 0 16px' }
const quoteBox = { background: 'hsl(0, 70%, 96%)', borderLeft: '4px solid hsl(0, 75%, 45%)', padding: '12px 16px', borderRadius: '8px', margin: '12px 0 20px' }
const quoteText = { fontSize: '13px', color: 'hsl(210, 10%, 30%)', margin: 0 }
const buttonBase = {
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
const buttonOk = { ...buttonBase, backgroundColor: 'hsl(120, 100%, 25%)' }
const buttonKo = { ...buttonBase, backgroundColor: 'hsl(207, 85%, 52%)' }
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }

export default ProductModerationEmail
