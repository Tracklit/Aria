// =============================================================================
// Aria Azure Infrastructure - Main Template
// =============================================================================
// This template deploys the Aria API to Azure App Service
// Integrates with existing TrackLit infrastructure (PostgreSQL, Redis, Key Vault)

targetScope = 'resourceGroup'

@description('Application name (will be used for resource naming)')
param appName string = 'Aria'

@description('Environment (dev, staging, prod)')
@allowed([
  'dev'
  'staging'
  'prod'
])
param environment string = 'prod'

@description('Azure region for resources')
param location string = resourceGroup().location

@description('Existing Key Vault name (TrackLit Key Vault)')
param keyVaultName string

@description('Existing PostgreSQL server name (TrackLit PostgreSQL)')
param postgresServerName string

@description('Existing Redis cache name (TrackLit Redis)')
param redisCacheName string

@description('App Service Plan SKU')
@allowed([
  'B1'
  'B2'
  'B3'
  'S1'
  'S2'
  'S3'
  'P1v2'
  'P2v2'
  'P3v2'
])
param appServicePlanSku string = 'B2'

@description('Docker image tag')
param dockerImageTag string = 'latest'

@description('Container registry URL')
param containerRegistryUrl string = 'ghcr.io'

@description('Container registry username')
param containerRegistryUsername string = ''

@description('Container registry password')
@secure()
param containerRegistryPassword string = ''

@description('Application Insights workspace ID (TrackLit workspace)')
param appInsightsWorkspaceId string

@description('Azure Communication Services connection string')
@secure()
param azureCommunicationConnectionString string = ''

@description('Azure Communication Services email from address')
param azureCommunicationFromEmail string = 'noreply@aria.app'

@description('Azure Communication Services phone number for SMS')
param azureCommunicationPhoneNumber string = ''

@description('Azure Storage account name for video/blob storage')
param storageAccountName string = ''

@description('Azure Cognitive Services Speech key')
@secure()
param azureSpeechKey string = ''

@description('Azure Cognitive Services Speech region')
param azureSpeechRegion string = location

@description('Azure Translator key')
@secure()
param azureTranslatorKey string = ''

@description('Azure Translator region')
param azureTranslatorRegion string = location

@description('TrackLit webhook URL for event notifications')
param trackLitWebhookUrl string = 'https://api.tracklit.app/webhooks/aria'

// =============================================================================
// VARIABLES
// =============================================================================

var resourcePrefix = '${appName}-${environment}'
var appServicePlanName = '${resourcePrefix}-plan'
var webAppName = '${resourcePrefix}-api'
var dockerImageName = '${containerRegistryUrl}/${containerRegistryUsername}/Aria:${dockerImageTag}'

// Tags for resource organization
var tags = {
  Application: 'Aria'
  Environment: environment
  ManagedBy: 'Bicep'
  Integration: 'TrackLit'
}

// =============================================================================
// EXISTING RESOURCES (TrackLit Infrastructure)
// =============================================================================

resource keyVault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: keyVaultName
}

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-03-01-preview' existing = {
  name: postgresServerName
}

resource redisCache 'Microsoft.Cache/redis@2023-08-01' existing = {
  name: redisCacheName
}

resource appInsightsWorkspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' existing = {
  name: appInsightsWorkspaceId
}

// =============================================================================
// NEW RESOURCES (Aria Specific)
// =============================================================================

// Storage Account for video uploads and blob storage
resource storageAccount 'Microsoft.Storage/storageAccounts@2023-01-01' = if (storageAccountName != '') {
  name: storageAccountName
  location: location
  tags: tags
  sku: {
    name: 'Standard_LRS'
  }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    supportsHttpsTrafficOnly: true
    minimumTlsVersion: 'TLS1_2'
    allowBlobPublicAccess: false
    networkAcls: {
      defaultAction: 'Allow'
      bypass: 'AzureServices'
    }
  }
}

// Blob container for video storage
resource blobContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-01-01' = if (storageAccountName != '') {
  name: '${storageAccountName}/default/aria-videos'
  properties: {
    publicAccess: 'None'
  }
  dependsOn: [
    storageAccount
  ]
}

// Application Insights for Aria
resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: '${resourcePrefix}-insights'
  location: location
  kind: 'web'
  tags: tags
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: appInsightsWorkspace.id
    publicNetworkAccessForIngestion: 'Enabled'
    publicNetworkAccessForQuery: 'Enabled'
  }
}

// App Service Plan (Linux with container support)
resource appServicePlan 'Microsoft.Web/serverfarms@2023-01-01' = {
  name: appServicePlanName
  location: location
  tags: tags
  sku: {
    name: appServicePlanSku
  }
  kind: 'linux'
  properties: {
    reserved: true // Required for Linux
  }
}

// Web App for Aria API
resource webApp 'Microsoft.Web/sites@2023-01-01' = {
  name: webAppName
  location: location
  tags: tags
  kind: 'app,linux,container'
  identity: {
    type: 'SystemAssigned'
  }
  properties: {
    serverFarmId: appServicePlan.id
    httpsOnly: true
    siteConfig: {
      linuxFxVersion: 'PYTHON|3.11'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
      appCommandLine: 'python -m uvicorn src.main:app --host 0.0.0.0 --port 8000'
      appSettings: [
        // Database configuration (TrackLit PostgreSQL)
        {
          name: 'DATABASE_URL'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/DATABASE-URL/)'
        }
        // Redis configuration (TrackLit Redis)
        {
          name: 'REDIS_URL'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/REDIS-URL/)'
        }
        // Authentication
        {
          name: 'JWT_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/JWT-SECRET/)'
        }
        {
          name: 'JWT_ALGORITHM'
          value: 'HS256'
        }
        {
          name: 'JWT_EXPIRATION_HOURS'
          value: '24'
        }
        // OpenAI
        {
          name: 'OPENAI_API_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/OPENAI-API-KEY/)'
        }
        // Stripe
        {
          name: 'STRIPE_SECRET_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/STRIPE-SECRET-KEY/)'
        }
        {
          name: 'STRIPE_WEBHOOK_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/STRIPE-WEBHOOK-SECRET/)'
        }
        // Terra API
        {
          name: 'TERRA_API_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/TERRA-API-KEY/)'
        }
        {
          name: 'TERRA_DEV_ID'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/TERRA-DEV-ID/)'
        }
        {
          name: 'TERRA_WEBHOOK_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/TERRA-WEBHOOK-SECRET/)'
        }
        // Azure Communication Services (Email & SMS)
        {
          name: 'AZURE_COMMUNICATION_CONNECTION_STRING'
          value: azureCommunicationConnectionString
        }
        {
          name: 'AZURE_COMMUNICATION_FROM_EMAIL'
          value: azureCommunicationFromEmail
        }
        {
          name: 'AZURE_COMMUNICATION_PHONE_NUMBER'
          value: azureCommunicationPhoneNumber
        }
        // Azure Storage (Video Analysis)
        {
          name: 'AZURE_STORAGE_CONNECTION_STRING'
          value: storageAccountName != '' ? 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net' : ''
        }
        {
          name: 'AZURE_STORAGE_CONTAINER_NAME'
          value: 'aria-videos'
        }
        // Azure Speech Services (Voice Interaction)
        {
          name: 'AZURE_SPEECH_KEY'
          value: azureSpeechKey
        }
        {
          name: 'AZURE_SPEECH_REGION'
          value: azureSpeechRegion
        }
        {
          name: 'SPEECH_LANGUAGE'
          value: 'en-US'
        }
        {
          name: 'SPEECH_VOICE_NAME'
          value: 'en-US-AriaNeural'
        }
        // Azure Translator (Multi-language Support)
        {
          name: 'AZURE_TRANSLATOR_KEY'
          value: azureTranslatorKey
        }
        {
          name: 'AZURE_TRANSLATOR_REGION'
          value: azureTranslatorRegion
        }
        // TrackLit Integration
        {
          name: 'TRACKLIT_API_URL'
          value: 'https://api.tracklit.app'
        }
        {
          name: 'TRACKLIT_API_KEY'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/TRACKLIT-API-KEY/)'
        }
        {
          name: 'TRACKLIT_WEBHOOK_SECRET'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/TRACKLIT-WEBHOOK-SECRET/)'
        }
        {
          name: 'TRACKLIT_WEBHOOK_URL'
          value: trackLitWebhookUrl
        }
        // Celery Background Tasks
        {
          name: 'CELERY_BROKER_URL'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/REDIS-URL/)'
        }
        {
          name: 'CELERY_RESULT_BACKEND'
          value: '@Microsoft.KeyVault(SecretUri=${keyVault.properties.vaultUri}secrets/REDIS-URL/)'
        }
        {
          name: 'CELERY_TASK_TIME_LIMIT'
          value: '300'
        }
        // Application Insights
        {
          name: 'APPLICATIONINSIGHTS_CONNECTION_STRING'
          value: appInsights.properties.ConnectionString
        }
        // CORS
        {
          name: 'ALLOWED_ORIGINS'
          value: 'https://tracklit.app,https://www.tracklit.app,https://api.tracklit.app'
        }
        // Application settings
        {
          name: 'ENVIRONMENT'
          value: environment
        }
        {
          name: 'LOG_LEVEL'
          value: 'INFO'
        }
        {
          name: 'WORKERS'
          value: '4'
        }
        // Python/App Service settings
        {
          name: 'SCM_DO_BUILD_DURING_DEPLOYMENT'
          value: 'true'
        }
        {
          name: 'WEBSITES_PORT'
          value: '8000'
        }
      ]
      healthCheckPath: '/health/ready'
    }
  }
}

// Grant Web App access to Key Vault
resource keyVaultAccessPolicy 'Microsoft.KeyVault/vaults/accessPolicies@2023-07-01' = {
  name: 'add'
  parent: keyVault
  properties: {
    accessPolicies: [
      {
        tenantId: subscription().tenantId
        objectId: webApp.identity.principalId
        permissions: {
          secrets: [
            'get'
            'list'
          ]
        }
      }
    ]
  }
}

// =============================================================================
// OUTPUTS
// =============================================================================

output webAppName string = webApp.name
output webAppUrl string = 'https://${webApp.properties.defaultHostName}'
output webAppPrincipalId string = webApp.identity.principalId
output appInsightsConnectionString string = appInsights.properties.ConnectionString
output appInsightsInstrumentationKey string = appInsights.properties.InstrumentationKey
output storageAccountName string = storageAccountName != '' ? storageAccount.name : ''
output storageAccountConnectionString string = storageAccountName != '' ? 'DefaultEndpointsProtocol=https;AccountName=${storageAccountName};AccountKey=${storageAccount.listKeys().keys[0].value};EndpointSuffix=core.windows.net' : ''
