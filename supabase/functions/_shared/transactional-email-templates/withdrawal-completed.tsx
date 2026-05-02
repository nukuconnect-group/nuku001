/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
  Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'NukuConnect'

const OPERATORS: Record<string, string> = {
  flooz: 'Flooz (Moov)',
  tmoney: 'T-Money (Togocel)',
  wave: 'Wave',
}

interface WithdrawalCompletedProps {
  userName?: string
  amount?: number
  operator?: string
  phoneNumber?: string
  adminNote?: string
}

const WithdrawalCompleted = ({
  userName = 'Utilisateur',
  amount = 0,
  operator = 'tmoney',
  phoneNumber = '',
  adminNote,
}: WithdrawalCompletedProps) => {
  const operatorLabel = OPERATORS[operator] || operator
  return (
    <Html>
      <Head />
      <Preview>Votre retrait de {amount.toLocaleString('fr-FR')} FCFA a été envoyé via {operatorLabel}</Preview>
      <Body style={{ backgroundColor: '#f4f4f5', fontFamily: 'Arial, sans-serif', padding: '40px 0' }}>
        <Container style={{ backgroundColor: '#ffffff', borderRadius: '12px', padding: '32px', maxWidth: '480px', margin: '0 auto' }}>
          <Heading style={{ fontSize: '20px', color: '#16a34a', textAlign: 'center' as const, margin: '0 0 16px' }}>
            ✅ Retrait approuvé et envoyé
          </Heading>

          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
            Bonjour <strong>{userName}</strong>,
          </Text>

          <Text style={{ fontSize: '14px', color: '#374151', lineHeight: '1.6' }}>
            Votre demande de retrait a été approuvée et le montant a été envoyé avec succès.
          </Text>

          <Section style={{ backgroundColor: '#f0fdf4', borderRadius: '8px', padding: '16px', margin: '16px 0' }}>
            <Text style={{ fontSize: '13px', color: '#374151', margin: '4px 0' }}>
              💰 <strong>Montant :</strong> {amount.toLocaleString('fr-FR')} FCFA
            </Text>
            <Text style={{ fontSize: '13px', color: '#374151', margin: '4px 0' }}>
              📱 <strong>Moyen :</strong> {operatorLabel}
            </Text>
            <Text style={{ fontSize: '13px', color: '#374151', margin: '4px 0' }}>
              📞 <strong>Numéro :</strong> {phoneNumber}
            </Text>
          </Section>

          {adminNote && (
            <Section style={{ backgroundColor: '#eff6ff', borderRadius: '8px', padding: '12px', margin: '12px 0' }}>
              <Text style={{ fontSize: '12px', color: '#1e40af', margin: '0' }}>
                📝 Note : {adminNote}
              </Text>
            </Section>
          )}

          <Hr style={{ borderColor: '#e5e7eb', margin: '20px 0' }} />

          <Text style={{ fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const }}>
            {SITE_NAME} — Votre marketplace agricole intelligente
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

export const template: TemplateEntry = {
  component: WithdrawalCompleted,
  subject: (data) => `✅ Retrait de ${(data.amount || 0).toLocaleString('fr-FR')} FCFA envoyé — ${SITE_NAME}`,
  displayName: 'Retrait approuvé',
  previewData: {
    userName: 'Jean Koffi',
    amount: 15000,
    operator: 'tmoney',
    phoneNumber: '90123456',
    adminNote: 'Envoi effectué',
  },
}
