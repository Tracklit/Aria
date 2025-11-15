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
      linuxFxVersion: 'DOCKER|${dockerImageName}'
      alwaysOn: true
      http20Enabled: true
      minTlsVersion: '1.2'
      ftpsState: 'Disabled'
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
        // Container registry
        {
          name: 'DOCKER_REGISTRY_SERVER_URL'
          value: 'https://${containerRegistryUrl}'
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_USERNAME'
          value: containerRegistryUsername
        }
        {
          name: 'DOCKER_REGISTRY_SERVER_PASSWORD'
          value: containerRegistryPassword
        }
        {
          name: 'WEBSITES_ENABLE_APP_SERVICE_STORAGE'
          value: 'false'
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
