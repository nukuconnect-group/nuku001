/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Hr, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'Nukuconnect'

type LinkKind = 'recovery' | 'magiclink' | 'signup'

interface AdminAccountLinkProps {
  name?: string
  actionLink?: string
  kind?: LinkKind
  adminNote?: string
}

const labels: Record<LinkKind, { title: string; intro: string; cta: string; expiry: string }> = {
  recovery: {
    title: '🔐 Réinitialisation de votre mot de passe',
    intro:
      "Un administrateur Nukuconnect a généré un lien sécurisé pour vous permettre de réinitialiser votre mot de passe et reprendre l'accès à votre compte.",
    cta: 'Réinitialiser mon mot de passe',
    expiry: 'Ce lien expire dans 1 heure pour votre sécurité.',
  },
  magiclink: {
    title: '✨ Lien de connexion magique',
    intro:
      "Un administrateur Nukuconnect vous a envoyé un lien de connexion magique. Cliquez simplement dessus pour accéder à votre compte sans mot de passe.",
    cta: 'Me connecter en un clic',
    expiry: 'Ce lien est à usage unique et expire dans 1 heure.',
  },
  signup: {
    title: '✉️ Confirmez votre adresse email',
    intro:
      "Voici un nouveau lien pour confirmer votre adresse email et activer définitivement votre compte Nukuconnect.",
    cta: 'Confirmer mon email',
    expiry: 'Ce lien expire dans 24 heures.',
  },
}

const AdminAccountLinkEmail = ({
  name,
  actionLink,
  kind = 'magiclink',
  adminNote,
}: AdminAccountLinkProps) => {
  const t = labels[kind] || labels.magiclink
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>{t.title}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>{t.title}</Heading>
          <Text style={text}>
            {name ? `Bonjour ${name},` : 'Bonjour,'}
          </Text>
          <Text style={text}>{t.intro}</Text>

          {actionLink && (
            <Section style={{ textAlign: 'center', margin: '28px 0' }}>
              <Button href={actionLink} style={button}>
                {t.cta}
              </Button>
            </Section>
          )}

          <Text style={smallText}>{t.expiry}</Text>

          {adminNote && (
            <>
              <Hr style={hr} />
              <Text style={noteText}>
                <strong>Message de l'admin :</strong> {adminNote}
              </Text>
            </>
          )}

          <Hr style={hr} />
          <Text style={footer}>
            Si vous n'avez rien demandé, ignorez cet email — votre compte reste sécurisé.
            <br />
            L'équipe {SITE_NAME}
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template = {
  component: AdminAccountLinkEmail,
  subject: (data: Record<string, any>) => {
    const k = (data?.kind as LinkKind) || 'magiclink'
    return labels[k]?.title || labels.magiclink.title
  },
  displayName: 'Accès au compte (admin)',
  previewData: {
    name: 'Komi',
    actionLink: 'https://nukuconnect.com/auth?type=magiclink',
    kind: 'magiclink',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px', maxWidth: '560px', margin: '0 auto' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#0f172a', margin: '0 0 20px' }
const text = { fontSize: '14px', color: '#334155', lineHeight: '1.55', margin: '0 0 14px' }
const smallText = { fontSize: '12px', color: '#64748b', margin: '12px 0 0' }
const noteText = { fontSize: '13px', color: '#334155', margin: '8px 0', backgroundColor: '#f8fafc', padding: '10px 12px', borderRadius: '6px' }
const button = {
  backgroundColor: '#16a34a',
  color: '#ffffff',
  padding: '12px 22px',
  borderRadius: '8px',
  textDecoration: 'none',
  fontWeight: 'bold' as const,
  fontSize: '14px',
  display: 'inline-block',
}
const hr = { borderColor: '#e2e8f0', margin: '24px 0' }
const footer = { fontSize: '12px', color: '#94a3b8', margin: '12px 0 0', lineHeight: '1.5' }
