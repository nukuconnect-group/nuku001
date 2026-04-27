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
  Link,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

const LOGO_URL = 'https://fpnhdihvnfsiymopbjgt.supabase.co/storage/v1/object/public/email-assets/nukuconnect-logo.png'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Confirmez votre email pour {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Img src={LOGO_URL} alt="NukuConnect" width="140" height="40" style={logo} />
        <Heading style={h1}>Bienvenue sur NukuConnect ! 🎉</Heading>
        <Text style={text}>
          Merci de vous être inscrit sur{' '}
          <Link href={siteUrl} style={link}>
            <strong>{siteName}</strong>
          </Link>
          !
        </Text>
        <Text style={text}>
          Veuillez confirmer votre adresse email (
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ) en cliquant sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Vérifier mon email
        </Button>
        <Text style={text}>
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :
          <br />
          <Link href={confirmationUrl} style={link}>{confirmationUrl}</Link>
          <br />
          <span style={{ fontSize: '12px', color: '#999999' }}>
            Site officiel : <Link href="https://nukuconnect.com" style={link}>https://nukuconnect.com</Link>
          </span>
        </Text>
        <Text style={footer}>
          Si vous n'avez pas créé de compte, vous pouvez ignorer cet email en toute sécurité.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: "'Poppins', Arial, sans-serif" }
const container = { padding: '32px 25px' }
const logo = { margin: '0 auto 24px', display: 'block', objectFit: 'contain' as const, maxWidth: '140px', height: 'auto' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: 'hsl(120, 100%, 25%)',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: 'hsl(210, 10%, 45%)',
  lineHeight: '1.6',
  margin: '0 0 25px',
}
const link = { color: 'hsl(207, 85%, 52%)', textDecoration: 'underline' }
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
