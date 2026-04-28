/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Img, Preview, Section, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NukuConnect'
const LOGO_URL = 'https://fpnhdihvnfsiymopbjgt.supabase.co/storage/v1/object/public/email-assets/nukuconnect-logo.png'

interface KycStatusProps {
  name?: string
  decision?: 'approved' | 'rejected'
  kycType?: 'driver' | 'supplier'
  adminNote?: string
  loginUrl?: string
}

const labelForType = (t?: string) =>
  t === 'driver' ? 'compte Livreur' : t === 'supplier' ? 'compte Fournisseur' : 'compte'

const KycStatusEmail = ({ name, decision, kycType, adminNote, loginUrl }: KycStatusProps) => {
  const approved = decision === 'approved'
  const targetUrl = loginUrl
    || (kycType === 'driver'
      ? 'https://nukuconnect.com/driver-dashboard'
      : 'https://nukuconnect.com/dashboard')

  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {approved
          ? `Votre vérification KYC est approuvée — ${labelForType(kycType)} actif`
          : `Votre vérification KYC a été refusée`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Img src={LOGO_URL} alt={SITE_NAME} width="80" height="80" style={logo} />
          <Heading style={approved ? h1Approved : h1Rejected}>
            {approved
              ? `✅ KYC approuvé${name ? `, ${name}` : ''} !`
              : `❌ KYC refusé${name ? `, ${name}` : ''}`}
          </Heading>

          {approved ? (
            <>
              <Text style={text}>
                Bonne nouvelle ! Votre vérification d'identité (KYC) pour votre <strong>{labelForType(kycType)}</strong> sur {SITE_NAME} a été <strong style={{ color: '#008000' }}>approuvée</strong> par notre équipe.
              </Text>
              <Section style={successBox}>
                <Text style={successTitle}>Votre compte est désormais actif</Text>
                <Text style={successItem}>
                  {kycType === 'driver'
                    ? '🚚 Vous pouvez recevoir et accepter des missions de livraison.'
                    : '🛡️ Le badge "Vérifié" est maintenant affiché sur votre profil fournisseur.'}
                </Text>
                <Text style={successItem}>
                  {kycType === 'driver'
                    ? '💰 Vos retraits de gains sont débloqués.'
                    : '⭐ Visibilité accrue auprès des acheteurs.'}
                </Text>
              </Section>
              <Section style={ctaSection}>
                <Button style={ctaButtonApproved} href={targetUrl}>
                  Accéder à mon compte
                </Button>
              </Section>
            </>
          ) : (
            <>
              <Text style={text}>
                Votre demande de vérification KYC pour votre <strong>{labelForType(kycType)}</strong> n'a pas pu être validée par notre équipe.
              </Text>
              {adminNote && (
                <Section style={rejectBox}>
                  <Text style={rejectTitle}>Motif du refus :</Text>
                  <Text style={rejectNote}>{adminNote}</Text>
                </Section>
              )}
              <Text style={text}>
                Vous pouvez resoumettre vos documents en vous connectant à votre compte. Assurez-vous que les photos soient nettes, valides et bien éclairées.
              </Text>
              <Section style={ctaSection}>
                <Button style={ctaButtonRejected} href={targetUrl}>
                  Resoumettre ma vérification
                </Button>
              </Section>
            </>
          )}

          <Hr style={divider} />
          <Text style={footer}>
            Besoin d'aide ? Contactez notre support à tout moment.
          </Text>
          <Text style={footer}>{SITE_NAME} — Marketplace Agricole d'Afrique</Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: KycStatusEmail,
  subject: (data: Record<string, any>) =>
    data?.decision === 'approved'
      ? `✅ Votre KYC est approuvé — ${SITE_NAME}`
      : `❌ Votre KYC a été refusé — ${SITE_NAME}`,
  displayName: 'Statut vérification KYC',
  previewData: {
    name: 'Kofi Mensah',
    decision: 'approved',
    kycType: 'driver',
    loginUrl: 'https://nukuconnect.com/driver-dashboard',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px', maxWidth: '600px' }
const logo = { margin: '0 auto 24px', display: 'block', objectFit: 'contain' as const, width: '80px', height: '80px' }
const h1Approved = { fontSize: '22px', fontWeight: 'bold' as const, color: '#008000', margin: '0 0 16px' }
const h1Rejected = { fontSize: '22px', fontWeight: 'bold' as const, color: '#dc2626', margin: '0 0 16px' }
const text = { fontSize: '14px', color: 'hsl(210, 10%, 45%)', lineHeight: '1.6', margin: '0 0 16px' }
const successBox = { backgroundColor: '#f0fdf4', borderLeft: '4px solid #008000', borderRadius: '8px', padding: '16px', margin: '16px 0 24px' }
const successTitle = { fontSize: '14px', fontWeight: 'bold' as const, color: '#008000', margin: '0 0 12px' }
const successItem = { fontSize: '13px', color: '#18181b', margin: '0 0 8px', lineHeight: '1.5' }
const rejectBox = { backgroundColor: '#fef2f2', borderLeft: '4px solid #dc2626', borderRadius: '8px', padding: '16px', margin: '16px 0 24px' }
const rejectTitle = { fontSize: '13px', fontWeight: 'bold' as const, color: '#dc2626', margin: '0 0 8px' }
const rejectNote = { fontSize: '13px', color: '#18181b', margin: 0, lineHeight: '1.5', fontStyle: 'italic' as const }
const ctaSection = { textAlign: 'center' as const, margin: '0 0 24px' }
const ctaButtonApproved = {
  backgroundColor: '#008000', color: '#ffffff', padding: '12px 24px',
  borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none',
}
const ctaButtonRejected = {
  backgroundColor: '#dc2626', color: '#ffffff', padding: '12px 24px',
  borderRadius: '8px', fontSize: '14px', fontWeight: 'bold' as const, textDecoration: 'none',
}
const divider = { borderTop: '1px solid #e4e4e7', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#999999', margin: '8px 0 0', lineHeight: '1.5' }
