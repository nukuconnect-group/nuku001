/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as orderConfirmation } from './order-confirmation.tsx'
import { template as welcome } from './welcome.tsx'
import { template as newMessage } from './new-message.tsx'
import { template as subscription } from './subscription.tsx'
import { template as productModeration } from './product-moderation.tsx'
import { template as kycStatus } from './kyc-status.tsx'
import { template as adminAccountLink } from './admin-account-link.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'order-confirmation': orderConfirmation,
  'welcome': welcome,
  'new-message': newMessage,
  'subscription': subscription,
  'product-moderation': productModeration,
  'kyc-status': kycStatus,
  'admin-account-link': adminAccountLink,
}
