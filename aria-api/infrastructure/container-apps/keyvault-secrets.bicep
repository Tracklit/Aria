// =============================================================================
// Key Vault Secrets Module for Aria
// =============================================================================
// This module creates the required secrets in Key Vault
// Run this AFTER the main deployment to populate secrets
// =============================================================================

targetScope = 'resourceGroup'

@description('Key Vault name')
param keyVaultName string

// =============================================================================
// DATABASE SECRETS
// =============================================================================

@description('PostgreSQL connection string')
@secure()
param databaseUrl string = ''

// =============================================================================
// REDIS SECRETS
// =============================================================================

@description('Redis connection string')
@secure()
param redisUrl string = ''

// =============================================================================
// AUTHENTICATION SECRETS
// =============================================================================

@description('JWT signing secret')
@secure()
param jwtSecret string = ''

// =============================================================================
// OPENAI SECRETS
// =============================================================================

@description('OpenAI API Key (for fallback/direct API)')
@secure()
param openaiApiKey string = ''

@description('Azure OpenAI API Key')
@secure()
param azureOpenaiKey string = ''

// =============================================================================
// STRIPE SECRETS
// =============================================================================

@description('Stripe Secret Key')
@secure()
param stripeSecretKey string = ''

@description('Stripe Webhook Secret')
@secure()
param stripeWebhookSecret string = ''

// =============================================================================
// TERRA API SECRETS
// =============================================================================

@description('Terra API Key')
@secure()
param terraApiKey string = ''

@description('Terra Dev ID')
@secure()
param terraDevId string = ''

@description('Terra Webhook Secret')
@secure()
param terraWebhookSecret string = ''

// =============================================================================
// AZURE AI SERVICES SECRETS
// =============================================================================

@description('Azure Speech Service Key')
@secure()
param azureSpeechKey string = ''

@description('Azure Translator Key')
@secure()
param azureTranslatorKey string = ''

@description('Azure Communication Services Connection String')
@secure()
param azureCommunicationConnectionString string = ''

// =============================================================================
// TRACKLIT INTEGRATION SECRETS
// =============================================================================

@description('TrackLit API Key')
@secure()
param tracklitApiKey string = ''

@description('TrackLit Webhook Secret')
@secure()
param tracklitWebhookSecret string = ''

// =============================================================================
// REFERENCE KEY VAULT
// =============================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

// =============================================================================
// SECRETS
// =============================================================================

resource databaseUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (databaseUrl != '') {
  parent: keyVault
  name: 'DATABASE-URL'
  properties: {
    value: databaseUrl
    contentType: 'text/plain'
  }
}

resource redisUrlSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (redisUrl != '') {
  parent: keyVault
  name: 'REDIS-URL'
  properties: {
    value: redisUrl
    contentType: 'text/plain'
  }
}

resource jwtSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (jwtSecret != '') {
  parent: keyVault
  name: 'JWT-SECRET'
  properties: {
    value: jwtSecret
    contentType: 'text/plain'
  }
}

resource openaiApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (openaiApiKey != '') {
  parent: keyVault
  name: 'OPENAI-API-KEY'
  properties: {
    value: openaiApiKey
    contentType: 'text/plain'
  }
}

resource azureOpenaiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (azureOpenaiKey != '') {
  parent: keyVault
  name: 'AZURE-OPENAI-KEY'
  properties: {
    value: azureOpenaiKey
    contentType: 'text/plain'
  }
}

resource stripeSecretKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (stripeSecretKey != '') {
  parent: keyVault
  name: 'STRIPE-SECRET-KEY'
  properties: {
    value: stripeSecretKey
    contentType: 'text/plain'
  }
}

resource stripeWebhookSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (stripeWebhookSecret != '') {
  parent: keyVault
  name: 'STRIPE-WEBHOOK-SECRET'
  properties: {
    value: stripeWebhookSecret
    contentType: 'text/plain'
  }
}

resource terraApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (terraApiKey != '') {
  parent: keyVault
  name: 'TERRA-API-KEY'
  properties: {
    value: terraApiKey
    contentType: 'text/plain'
  }
}

resource terraDevIdSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (terraDevId != '') {
  parent: keyVault
  name: 'TERRA-DEV-ID'
  properties: {
    value: terraDevId
    contentType: 'text/plain'
  }
}

resource terraWebhookSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (terraWebhookSecret != '') {
  parent: keyVault
  name: 'TERRA-WEBHOOK-SECRET'
  properties: {
    value: terraWebhookSecret
    contentType: 'text/plain'
  }
}

resource azureSpeechKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (azureSpeechKey != '') {
  parent: keyVault
  name: 'AZURE-SPEECH-KEY'
  properties: {
    value: azureSpeechKey
    contentType: 'text/plain'
  }
}

resource azureTranslatorKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (azureTranslatorKey != '') {
  parent: keyVault
  name: 'AZURE-TRANSLATOR-KEY'
  properties: {
    value: azureTranslatorKey
    contentType: 'text/plain'
  }
}

resource azureCommunicationConnectionStringSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (azureCommunicationConnectionString != '') {
  parent: keyVault
  name: 'AZURE-COMMUNICATION-CONNECTION-STRING'
  properties: {
    value: azureCommunicationConnectionString
    contentType: 'text/plain'
  }
}

resource tracklitApiKeySecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (tracklitApiKey != '') {
  parent: keyVault
  name: 'TRACKLIT-API-KEY'
  properties: {
    value: tracklitApiKey
    contentType: 'text/plain'
  }
}

resource tracklitWebhookSecretSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = if (tracklitWebhookSecret != '') {
  parent: keyVault
  name: 'TRACKLIT-WEBHOOK-SECRET'
  properties: {
    value: tracklitWebhookSecret
    contentType: 'text/plain'
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

output keyVaultName string = keyVault.name
output secretsCreated array = [
  databaseUrl != '' ? 'DATABASE-URL' : ''
  redisUrl != '' ? 'REDIS-URL' : ''
  jwtSecret != '' ? 'JWT-SECRET' : ''
  openaiApiKey != '' ? 'OPENAI-API-KEY' : ''
  azureOpenaiKey != '' ? 'AZURE-OPENAI-KEY' : ''
  stripeSecretKey != '' ? 'STRIPE-SECRET-KEY' : ''
  stripeWebhookSecret != '' ? 'STRIPE-WEBHOOK-SECRET' : ''
  terraApiKey != '' ? 'TERRA-API-KEY' : ''
  terraDevId != '' ? 'TERRA-DEV-ID' : ''
  terraWebhookSecret != '' ? 'TERRA-WEBHOOK-SECRET' : ''
  azureSpeechKey != '' ? 'AZURE-SPEECH-KEY' : ''
  azureTranslatorKey != '' ? 'AZURE-TRANSLATOR-KEY' : ''
  azureCommunicationConnectionString != '' ? 'AZURE-COMMUNICATION-CONNECTION-STRING' : ''
  tracklitApiKey != '' ? 'TRACKLIT-API-KEY' : ''
  tracklitWebhookSecret != '' ? 'TRACKLIT-WEBHOOK-SECRET' : ''
]
