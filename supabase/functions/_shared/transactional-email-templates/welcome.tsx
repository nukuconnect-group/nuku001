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
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NukuConnect'
const LOGO_URL = 'https://fpnhdihvnfsiymopbjgt.supabase.co/storage/v1/object/public/email-assets/nukuconnect-logo.png'

interface WelcomeEmailProps {
  name?: string
  userType?: string
}

const getUserTypeLabel = (type?: string) => {
  switch (type) {
    case 'producer': return 'Fournisseur'
    case 'buyer': return 'Acheteur'
    case 'driver': return 'Livreur'
    case 'learner': return 'Apprenant'
    case 'trainer': return 'Formateur'
    default: return 'Membre'
  }
}

const WelcomeEmail = ({ name, userType }: WelcomeEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Bienvenue sur {SITE_NAME} ! 🌱</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt={SITE_NAME} width="120" height="40" style={logo} />
        <Heading style={h1}>
          Bienvenue{name ? `, ${name}` : ''} ! 🎉
        </Heading>
        <Text style={text}>
          Votre compte <strong>{getUserTypeLabel(userType)}</strong> a été créé avec succès sur {SITE_NAME}, 
          la marketplace agricole intelligente d'Afrique.
        </Text>

        <Section style={featureBox}>
          <Text style={featureTitle}>Ce que vous pouvez faire :</Text>
          <Text style={featureItem}>🛒 Acheter et vendre des produits agricoles</Text>
          <Text style={featureItem}>🤖 Utiliser notre assistant IA agricole</Text>
          <Text style={featureItem}>📦 Suivre vos livraisons en temps réel</Text>
          <Text style={featureItem}>📚 Accéder à des formations certifiées</Text>
        </Section>

        <Section style={ctaSection}>
          <Button style={ctaButton} href="https://nukuconnect.lovable.app/marketplace">
            Explorer la Marketplace
          </Button>
        </Section>

        <Hr style={divider} />
        <Text style={footer}>
          Besoin d'aide ? Notre équipe est disponible pour vous accompagner.
        </Text>
        <Text style={footer}>
          {SITE_NAME} — Marketplace Agricole du Togo
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WelcomeEmail,
  subject: `Bienvenue sur ${SITE_NAME} ! 🌱`,
  displayName: 'Email de bienvenue',
  previewData: {
    name: 'Kofi Mensah',
    userType: 'buyer',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px', maxWidth: '600px' }
const logo = { margin: '0 0 24px 0' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#008000', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(210, 10%, 45%)', lineHeight: '1.6', margin: '0 0 24px' }
const featureBox = { backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', margin: '0 0 24px' }
const featureTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#008000', margin: '0 0 12px' }
const featureItem = { fontSize: '13px', color: '#18181b', margin: '0 0 8px', lineHeight: '1.5' }
const ctaSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const ctaButton = {
  backgroundColor: '#008000',
  color: '#ffffff',
  padding: '12px 24px',
  borderRadius: '8px',
  fontSize: '14px',
  fontWeight: 'bold' as const,
  textDecoration: 'none',
}
const divider = { borderTop: '1px solid #e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '8px 0 0', lineHeight: '1.5' }
